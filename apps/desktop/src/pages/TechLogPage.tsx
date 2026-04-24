import { useEffect, useState, FormEvent } from 'react';
import {
  Wrench, Plus, Pencil, Trash2, Search, X, Download,
  Monitor, Printer, Activity, FlaskConical, Camera, Wifi, Zap, Wind, MapPin,
} from 'lucide-react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';

type TechLog = {
  id: string; happenedAt: string; issue: string; cause: string | null;
  resolution: string; durationMin: number | null; cost: number | null;
  status: string; technicianName: string | null;
  deviceType: string | null; deviceName: string | null;
  location: string | null; priority: string | null;
  computer: { id: string; name: string } | null;
  user: { username: string; fullName: string };
};
type Computer = { id: string; name: string };

const DEVICE_TYPES = [
  { value: 'MAY_TINH',   label: 'Máy tính',       Icon: Monitor,      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'MAY_IN',     label: 'Máy in',          Icon: Printer,      color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'SIEU_AM',    label: 'Máy siêu âm',     Icon: Activity,     color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
  { value: 'XET_NGHIEM', label: 'Máy xét nghiệm',  Icon: FlaskConical, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'CAMERA',     label: 'Camera',           Icon: Camera,       color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { value: 'MANG_WIFI',  label: 'Mạng / Wifi',     Icon: Wifi,         color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
  { value: 'DIEN_DEN',   label: 'Điện / Đèn',      Icon: Zap,          color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'DIEU_HOA',   label: 'Điều hòa',        Icon: Wind,         color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'KHAC',       label: 'Khác',             Icon: Wrench,       color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
] as const;
const DM = Object.fromEntries(DEVICE_TYPES.map(d => [d.value, d])) as Record<string, typeof DEVICE_TYPES[number]>;

const PRIORITIES = [
  { value: 'THAP',       label: 'Thấp',       color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  { value: 'TRUNG_BINH', label: 'Trung bình', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'CAO',        label: 'Cao',         color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' },
  { value: 'KHAN_CAP',   label: 'Khẩn cấp',   color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
];
const PM = Object.fromEntries(PRIORITIES.map(p => [p.value, p]));

const SM: Record<string, { label: string; color: string }> = {
  HOAN_THANH: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DANG_XU_LY: { label: 'Đang xử lý', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  CHO_XU_LY:  { label: 'Chờ xử lý',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const emptyForm = {
  happenedAt: '', deviceType: 'MAY_TINH', deviceName: '', computerId: '',
  location: '', priority: 'TRUNG_BINH', issue: '', cause: '',
  resolution: '', durationMin: '', cost: '', status: 'HOAN_THANH', technicianName: '',
};
const cls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500';

function devLabel(l: TechLog) {
  if (l.deviceType === 'MAY_TINH' && l.computer) return l.computer.name;
  if (l.deviceName) return l.deviceName;
  if (l.deviceType && DM[l.deviceType]) return DM[l.deviceType].label;
  return 'Không xác định';
}

export default function TechLogPage() {
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);
  const canEdit = role === 'ADMIN' || role === 'TECH';
  const isAdmin = role === 'ADMIN';

  const [items, setItems] = useState<TechLog[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fDev, setFDev] = useState('');
  const [fSta, setFSta] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const p: Record<string, string> = {};
      if (search) p.q = search;
      if (fSta) p.status = fSta;
      if (fDev) p.deviceType = fDev;
      if (fFrom) p.dateFrom = fFrom;
      if (fTo) p.dateTo = fTo;
      const [lr, cr] = await Promise.all([api.get('/techlogs', { params: p }), api.get('/computers')]);
      setItems(lr.data.items); setComputers(cr.data.items);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, fSta, fDev, fFrom, fTo]);
  useEffect(() => {
    const s = getSocket(); s.emit('join', 'techlogs'); s.on('techlogs:changed', () => fetchData());
    return () => { s.off('techlogs:changed'); };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, happenedAt: new Date().toISOString().slice(0, 16), technicianName: user?.fullName || user?.username || '' });
    setError(''); setShowModal(true);
  };
  const openEdit = (l: TechLog) => {
    setEditingId(l.id);
    setForm({
      happenedAt: new Date(l.happenedAt).toISOString().slice(0, 16),
      deviceType: l.deviceType || 'MAY_TINH', deviceName: l.deviceName || '',
      computerId: l.computer?.id || '', location: l.location || '',
      priority: l.priority || 'TRUNG_BINH', issue: l.issue, cause: l.cause || '',
      resolution: l.resolution,
      durationMin: l.durationMin != null ? String(l.durationMin) : '',
      cost: l.cost != null ? String(l.cost) : '',
      status: l.status, technicianName: l.technicianName || '',
    });
    setError(''); setShowModal(true);
  };
  const handleSave = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const d = {
        ...form,
        computerId: form.deviceType === 'MAY_TINH' ? (form.computerId || null) : null,
        deviceName: form.deviceName || null, location: form.location || null,
        cause: form.cause || null,
        durationMin: form.durationMin ? parseInt(form.durationMin) : null,
        cost: form.cost ? parseFloat(form.cost) : null,
        technicianName: form.technicianName || null,
      };
      if (editingId) await api.put(`/techlogs/${editingId}`, d);
      else await api.post('/techlogs', d);
      setShowModal(false); fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể lưu. Thử lại.');
    } finally { setSaving(false); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Xóa phiếu này?')) return;
    await api.delete(`/techlogs/${id}`); fetchData();
  };
  const handleExport = () => {
    const base = localStorage.getItem('serverUrl') || 'http://localhost:4000';
    const token = localStorage.getItem('accessToken') || '';
    fetch(`${base}/api/export/techlogs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `nhat-ky-ky-thuat-${Date.now()}.xlsx`; a.click();
      });
  };

  const hasF = !!(fDev || fSta || fFrom || fTo || search);
  const pendingCount = items.filter(l => l.status !== 'HOAN_THANH').length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Nhật ký kỹ thuật</h2>
          {pendingCount > 0 && <p className="text-sm text-amber-600 font-medium mt-0.5">{pendingCount} phiếu chưa hoàn thành</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download size={16} /> Xuất Excel
          </button>
          {canEdit && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
              <Plus size={16} /> Thêm phiếu
            </button>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm lỗi, thiết bị, vị trí..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={fDev} onChange={e => setFDev(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none">
          <option value="">Tất cả thiết bị</option>
          {DEVICE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select value={fSta} onChange={e => setFSta(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none">
          <option value="">Tất cả trạng thái</option>
          <option value="HOAN_THANH">Hoàn thành</option>
          <option value="DANG_XU_LY">Đang xử lý</option>
          <option value="CHO_XU_LY">Chờ xử lý</option>
        </select>
        <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} title="Từ ngày"
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none" />
        <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} title="Đến ngày"
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none" />
        {hasF && (
          <button onClick={() => { setSearch(''); setFDev(''); setFSta(''); setFFrom(''); setFTo(''); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <X size={14} /> Xóa lọc
          </button>
        )}
      </div>

      {/* ── List ── */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-12">Chưa có phiếu nào{hasF ? ' phù hợp bộ lọc' : ''}.</p>
      ) : (
        <div className="space-y-2">
          {items.map(log => {
            const dt = log.deviceType ? DM[log.deviceType] : null;
            const Ic = dt?.Icon ?? Wrench;
            const ic = dt?.color ?? 'bg-gray-100 text-gray-500';
            const st = SM[log.status] ?? { label: log.status, color: 'bg-gray-100 text-gray-600' };
            const pr = log.priority ? PM[log.priority] : null;
            return (
              <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ic}`}><Ic size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{devLabel(log)}</span>
                        {dt && <span className="text-xs text-gray-400">{dt.label}</span>}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        {pr && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.color}`}>{pr.label}</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(log.happenedAt).toLocaleDateString('vi-VN')}</span>
                        {canEdit && <>
                          <button onClick={() => openEdit(log)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><Pencil size={13} /></button>
                          {isAdmin && <button onClick={() => handleDelete(log.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"><Trash2 size={13} /></button>}
                        </>}
                      </div>
                    </div>
                    {log.location && <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1"><MapPin size={11} />{log.location}</p>}
                    <p className="text-sm text-red-600 dark:text-red-400 mb-1"><strong>Lỗi:</strong> {log.issue}</p>
                    {log.cause && <p className="text-sm text-amber-600 dark:text-amber-400 mb-1"><strong>Nguyên nhân:</strong> {log.cause}</p>}
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1"><strong>Xử lý:</strong> {log.resolution}</p>
                    <div className="flex gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                      {log.technicianName && <span>👤 {log.technicianName}</span>}
                      {log.durationMin && <span>⏱ {log.durationMin} phút</span>}
                      {log.cost != null && log.cost > 0 && <span>💰 {log.cost.toLocaleString('vi-VN')} đ</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-2xl">
              <h3 className="text-lg font-semibold">{editingId ? 'Sửa phiếu' : 'Thêm phiếu sửa chữa'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Loại thiết bị *</label>
                  <select required value={form.deviceType} onChange={e => setForm({ ...form, deviceType: e.target.value, deviceName: '', computerId: '' })} className={cls}>
                    {DEVICE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Ngày sửa *</label>
                  <input type="datetime-local" required value={form.happenedAt} onChange={e => setForm({ ...form, happenedAt: e.target.value })} className={cls} />
                </div>
              </div>
              {form.deviceType === 'MAY_TINH' ? (
                <div>
                  <label className="block text-xs font-medium mb-1">Máy tính</label>
                  <select value={form.computerId} onChange={e => setForm({ ...form, computerId: e.target.value })} className={cls}>
                    <option value="">-- Chọn máy --</option>
                    {computers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium mb-1">Tên thiết bị{form.deviceType === 'KHAC' ? ' *' : ''}</label>
                  <input required={form.deviceType === 'KHAC'} value={form.deviceName} onChange={e => setForm({ ...form, deviceName: e.target.value })}
                    placeholder={form.deviceType === 'KHAC' ? 'VD: Máy fax, Tivi...' : 'VD: Máy in phòng A3 (tùy chọn)'} className={cls} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Vị trí sửa</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="VD: Phòng khám số 3" className={cls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Mức độ ưu tiên</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={cls}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mô tả lỗi / hạng mục *</label>
                <textarea required rows={2} value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })}
                  placeholder="Mô tả lỗi hoặc công việc..." className={`${cls} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nguyên nhân</label>
                <input value={form.cause} onChange={e => setForm({ ...form, cause: e.target.value })} placeholder="Nếu xác định được" className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Cách xử lý *</label>
                <textarea required rows={2} value={form.resolution} onChange={e => setForm({ ...form, resolution: e.target.value })}
                  placeholder="Mô tả cách đã xử lý..." className={`${cls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Người thực hiện</label>
                  <input value={form.technicianName} onChange={e => setForm({ ...form, technicianName: e.target.value })} className={cls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Trạng thái</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={cls}>
                    <option value="HOAN_THANH">Hoàn thành</option>
                    <option value="DANG_XU_LY">Đang xử lý</option>
                    <option value="CHO_XU_LY">Chờ xử lý</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Thời gian (phút)</label>
                  <input type="number" min="1" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: e.target.value })} className={cls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Chi phí (VNĐ)</label>
                  <input type="number" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className={cls} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Hủy</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium">
                  {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
