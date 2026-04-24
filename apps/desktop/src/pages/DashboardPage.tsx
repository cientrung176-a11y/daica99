import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  HardDrive,
  Monitor,
  MonitorOff,
  AlertTriangle,
  Activity,
  Wrench,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DashboardData = {
  totalDevices: number;
  totalComputers: number;
  onlineComputers: number;
  offlineComputers: number;
  devicesError: number;
  devicesWarning: number;
  techLogThisMonth: number;
  techLogPending: number;
  byDepartment: { department: string; count: number }[];
  recentAudit: { id: string; happenedAt: string; action: string; detail: string | null }[];
  recentTechLogs: {
    id: string; happenedAt: string; issue: string; status: string;
    technicianName: string | null;
    computer: { name: string } | null;
    user: { fullName: string; username: string };
  }[];
};

const statCards = (d: DashboardData) => [
  { label: 'Tổng thiết bị', value: d.totalDevices, icon: HardDrive, color: 'bg-blue-500' },
  { label: 'Máy trực tuyến', value: d.onlineComputers, icon: Activity, color: 'bg-green-500' },
  { label: 'Máy ngoại tuyến', value: d.offlineComputers, icon: MonitorOff, color: 'bg-red-500' },
  { label: 'Thiết bị lỗi', value: d.devicesError, icon: AlertTriangle, color: 'bg-orange-500' },
  { label: 'Phiếu sửa tháng này', value: d.techLogThisMonth, icon: Wrench, color: 'bg-purple-500' },
  { label: 'Chờ xử lý', value: d.techLogPending, icon: Clock, color: d.techLogPending > 0 ? 'bg-yellow-500' : 'bg-gray-400' },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
