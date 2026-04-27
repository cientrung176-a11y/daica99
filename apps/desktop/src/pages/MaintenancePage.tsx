import { useEffect, useState, FormEvent } from 'react';
import { CalendarClock, Plus, Pencil, Trash2, CheckCircle, Circle, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type Target = { id: string; name: string } | null;
type Schedule = {
  id: string;
  title: string;
  scheduledAt: string;
  repeatDays: number | null;
  note: string | null;
  isDone: boolean;
  computer: Target;
  device: Target;
};

const emptyForm = {
  title: '',
  computerId: '',
  deviceId: '',
  scheduledAt: '',
  repeatDays: '',
  note: '',
};

function statusLabel(s: Schedule): { label: string; color: string } {
  if (s.isDone) return { label: 'Hoàn thành', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' };
  const diff = new Date(s.scheduledAt).getTime() - Date.now();
  if (diff < 0) return { label: 'Quá hạn', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
  if (diff < 3 * 24 * 60 * 60 * 1000) return { label: 'Sắp tới', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' };
  return { label: 'Chưa làm', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' };
}

export default function MaintenancePage() {
  const user = useAuthStore(s => s.user);
  const canEdit = user?.role === 'ADMIN' || user?.role === 'TECH';

  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const fetchData = async () => {
    try {
      const res = await api.get('/maintenance');
      setItems(res.data.items);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const visible = items.filter(s => {
    if (filter === 'done') return s.isDone;
    if (filter === 'pending') return !s.isDone;
    return true;
  });

  const overdueCount = items.filter(s => !s.isDone && new Date(s.scheduledAt) < new Date()).length;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, scheduledAt: new Date().toISOString().slice(0, 16) });
    setError(''); setShowModal(true);
  };

  const openEdit = (s: Schedule) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      computerId: s.computer?.id || '',
      deviceId: s.device?.id || '',
      scheduledAt: new Date(s.scheduledAt).toISOString().slice(0, 16),
      repeatDays: s.repeatDays?.toString() || '',
      note: s.note || '',
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const body = {
        title: form.title,
        computerId: form.computerId || null,
        deviceId: form.deviceId || null,
        scheduledAt: form.scheduledAt,
        repeatDays: form.repeatDays ? parseInt(form.repeatDays) : null,
        note: form.note || null,
      };
      if (editingId) { await api.put(`/maintenance/${editingId}`, body); }
      else { await api.post('/maintenance', body); }
      setShowModal(false); fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể lưu. Thử lại.');
    } finally { setSaving(false); }
  };

  const toggleDone = async (id: string) => {
    await api.patch(`/maintenance/${id}/done`, {});
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa lịch bảo trì này?')) return;
    await api.delete(`/maintenance/${id}`);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Lịch bảo trì</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng: <span className="font-semibold text-gray-700 dark:text-gray-300">{items.length} lịch</span>
            {overdueCount > 0 && (
              <span className="ml-2 text-red-600 font-semibold flex-inline items-center gap-1">
                <AlertTriangle className="inline w-3 h-3" /> {overdueCount} quá hạn
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500" title="Làm mới">
            <RefreshCw size={16} />
          </button>
          {canEdit && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
              <Plus size={16} /> Thêm lịch
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chưa xong' : 'Hoàn thành'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-10">Đang tải...</p>
      ) : visible.length === 0 ? (
        <p className="text-gray-400 text-center py-10">Chưa có lịch bảo trì nào.</p>
      ) : (
        <div className="space-y-3">
          {visible.map(s => {
            const { label, color } = statusLabel(s);
            const isOverdue = !s.isDone && new Date(s.scheduledAt) < new Date();
            return (
              <div key={s.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border flex items-start gap-4 ${
                  isOverdue ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'
                }`}>
                {canEdit ? (
                  <button onClick={() => toggleDone(s.id)} className="mt-0.5 shrink-0">
                    {s.isDone
                      ? <CheckCircle size={20} className="text-green-500" />
                      : <Circle size={20} className="text-gray-300 hover:text-primary-500" />}
                  </button>
                ) : (
                  <div className="mt-0.5 shrink-0">
                    {s.isDone ? <CheckCircle size={20} className="text-green-500" /> : <Circle size={20} className="text-gray-300" />}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className={`font-semibold text-gray-900 dark:text-gray-100 ${s.isDone ? 'line-through text-gray-400' : ''}`}>
                      {s.title}
                    </p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${color}`}>{label}</span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                    <span>📅 {new Date(s.scheduledAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    {s.repeatDays && <span>🔄 Lặp {s.repeatDays} ngày</span>}
                    {s.computer && <span>💻 {s.computer.name}</span>}
                    {s.device && <span>🔧 {s.device.name}</span>}
                    {s.note && <span className="col-span-2 italic text-gray-400">{s.note}</span>}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700" title="Sửa"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400" title="Xóa"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock size={18} className="text-primary-600" />
                <h3 className="text-lg font-semibold">{editingId ? 'Sửa lịch bảo trì' : 'Thêm lịch bảo trì'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
            </div>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tiêu đề *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Bảo trì định kỳ máy tính phòng A"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Ngày giờ thực hiện *</label>
                  <input required type="datetime-local" value={form.scheduledAt}
                    onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Lặp lại (ngày)</label>
                  <input type="number" min="1" value={form.repeatDays}
                    onChange={e => setForm({ ...form, repeatDays: e.target.value })}
                    placeholder="VD: 30 (hàng tháng)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">ID Máy tính (nếu có)</label>
                  <input value={form.computerId} onChange={e => setForm({ ...form, computerId: e.target.value })}
                    placeholder="ID máy tính"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">ID Thiết bị (nếu có)</label>
                  <input value={form.deviceId} onChange={e => setForm({ ...form, deviceId: e.target.value })}
                    placeholder="ID thiết bị"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Ghi chú</label>
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600">Hủy</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
