import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  HardDrive, MonitorOff, AlertTriangle,
  Activity, Wrench, Clock, RefreshCw, ShieldAlert,
  BookOpen, Cpu,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

type WarrantyItem = { id: string; name: string; type: string; warrantyUntil: string; department: string | null };

type DashboardData = {
  totalDevices: number;
  totalComputers: number;
  onlineComputers: number;
  offlineComputers: number;
  devicesError: number;
  devicesWarning: number;
  techLogThisMonth: number;
  techLogThisWeek: number;
  techLogPending: number;
  devicesBorrowed: number;
  warrantyExpiringSoon: WarrantyItem[];
  byDepartment: { department: string; count: number }[];
  recentAudit: { id: string; happenedAt: string; action: string; detail: string | null }[];
  recentTechLogs: {
    id: string; happenedAt: string; issue: string; status: string;
    technicianName: string | null;
    computer: { name: string } | null;
    user: { fullName: string; username: string };
  }[];
};

type ComputerLive = {
  id: string; name: string; isOnline: boolean;
  cpuPercent: number | null; ramPercent: number | null;
  currentUser: string | null; ipInternal: string | null;
};

const statCards = (d: DashboardData) => [
  { label: 'Tổng thiết bị',        value: d.totalDevices,           icon: HardDrive,    color: 'bg-blue-500' },
  { label: 'Máy trực tuyến',       value: d.onlineComputers,        icon: Activity,     color: 'bg-green-500' },
  { label: 'Máy ngoại tuyến',      value: d.offlineComputers,       icon: MonitorOff,   color: d.offlineComputers > 0 ? 'bg-red-500' : 'bg-gray-400' },
  { label: 'Thiết bị lỗi',         value: d.devicesError,           icon: AlertTriangle,color: d.devicesError > 0 ? 'bg-orange-500' : 'bg-gray-400' },
  { label: 'Phiếu sửa tuần này',   value: d.techLogThisWeek,        icon: Wrench,       color: 'bg-purple-500' },
  { label: 'Chờ xử lý',            value: d.techLogPending,         icon: Clock,        color: d.techLogPending > 0 ? 'bg-yellow-500' : 'bg-gray-400' },
  { label: 'Đang cho mượn',        value: d.devicesBorrowed,        icon: BookOpen,     color: d.devicesBorrowed > 0 ? 'bg-amber-500' : 'bg-gray-400' },
  { label: 'Sắp hết bảo hành',     value: d.warrantyExpiringSoon?.length ?? 0, icon: ShieldAlert, color: (d.warrantyExpiringSoon?.length ?? 0) > 0 ? 'bg-rose-500' : 'bg-gray-400' },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [computers, setComputers] = useState<ComputerLive[]>([]);

  const fetchData = async () => {
    try {
      const [dashRes, compRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/computers'),
      ]);
      setData(dashRes.data);
      setComputers(compRes.data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    const socket = getSocket();
    socket.emit('join', 'devices');
    socket.emit('join', 'computers');
    socket.on('devices:changed', () => fetchData());
    socket.on('computers:changed', () => fetchData());
    socket.on('techlogs:changed', () => fetchData());
    return () => {
      clearInterval(interval);
      socket.off('devices:changed');
      socket.off('computers:changed');
      socket.off('techlogs:changed');
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-400">Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-red-400">Không thể tải dữ liệu. Kiểm tra kết nối server.</span>
      </div>
    );
  }

  const cards = statCards(data);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bảng điều khiển</h2>
        <button onClick={fetchData} className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500" title="Làm mới">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${c.color} text-white mb-3`}>
              <c.icon size={20} />
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* CPU / RAM live */}
      {computers.filter(c => c.isOnline).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={18} className="text-blue-500" />
            <h3 className="text-base font-semibold">CPU / RAM theo thời gian thực</h3>
            <span className="ml-auto text-xs text-gray-400">Cập nhật mỗi 30s</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {computers.filter(c => c.isOnline).map(c => (
              <div key={c.id} className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  <span className="text-xs text-green-500 font-medium">● Online</span>
                </div>
                {c.currentUser && <span className="text-xs text-gray-400">👤 {c.currentUser}</span>}
                {c.cpuPercent != null && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>CPU</span>
                      <span className={c.cpuPercent > 85 ? 'text-red-500 font-bold' : ''}>{c.cpuPercent.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        c.cpuPercent > 85 ? 'bg-red-500' : c.cpuPercent > 60 ? 'bg-amber-400' : 'bg-green-500'
                      }`} style={{ width: `${c.cpuPercent}%` }} />
                    </div>
                  </div>
                )}
                {c.ramPercent != null && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>RAM</span>
                      <span className={c.ramPercent > 85 ? 'text-red-500 font-bold' : ''}>{c.ramPercent.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        c.ramPercent > 85 ? 'bg-red-500' : c.ramPercent > 60 ? 'bg-amber-400' : 'bg-blue-500'
                      }`} style={{ width: `${c.ramPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warranty expiring */}
      {(data.warrantyExpiringSoon?.length ?? 0) > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-rose-100 dark:border-rose-900/30">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={18} className="text-rose-500" />
            <h3 className="text-base font-semibold text-rose-600 dark:text-rose-400">Thiết bị sắp hết bảo hành (trong 30 ngày)</h3>
          </div>
          <div className="space-y-2">
            {data.warrantyExpiringSoon.map(w => {
              const days = Math.ceil((new Date(w.warrantyUntil).getTime() - Date.now()) / 86400000);
              return (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <span className="text-sm font-medium">{w.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{w.type}{w.department ? ` · ${w.department}` : ''}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    days <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>còn {days} ngày</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Thiết bị theo phòng ban</h3>
          {data.byDepartment.length === 0 ? (
            <p className="text-gray-400 text-sm">Chưa có dữ liệu.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số lượng" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Hoạt động đăng nhập</h3>
          {data.recentAudit.length === 0 ? (
            <p className="text-gray-400 text-sm">Chưa có hoạt động.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {data.recentAudit.map((a) => (
                <li key={a.id} className="flex items-start gap-3 text-sm py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <span className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary-500" />
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">{a.detail || a.action}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(a.happenedAt).toLocaleString('vi-VN')}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent tech logs */}
      {data.recentTechLogs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Phiếu sửa chữa gần đây</h3>
          <div className="space-y-2">
            {data.recentTechLogs.map((l) => {
              const isPending = l.status !== 'HOAN_THANH';
              return (
                <div key={l.id} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div className={`shrink-0 w-2 h-2 mt-2 rounded-full ${isPending ? 'bg-yellow-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{l.computer?.name || 'Thiết bị khác'} — {l.issue}</span>
                      <span className="text-xs text-gray-400 shrink-0">{new Date(l.happenedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <p className="text-xs text-gray-400">{l.technicianName || l.user.fullName} • {isPending ? '⏳ Chưa xong' : '✅ Hoàn thành'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
