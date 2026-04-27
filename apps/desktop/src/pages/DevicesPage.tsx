import { useEffect, useState, FormEvent } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { Plus, Pencil, Trash2, Search, X, BookOpen, CheckCircle, RotateCcw } from 'lucide-react';

type BorrowLog = {
  id: string;
  borrowerName: string;
  borrowedAt: string;
  returnedAt: string | null;
  isReturned: boolean;
  note: string | null;
};

type Device = {
  id: string;
  name: string;
  type: string;
  brand: string | null;
  model: string | null;
  serial: string | null;
  department: string | null;
  owner: string | null;
  purchaseDate: string | null;
  warrantyUntil: string | null;
  status: string;
  note: string | null;
  imageUrl: string | null;
};

const statusMap: Record<string, { label: string; color: string }> = {
  TOT: { label: 'Tốt', color: 'bg-green-100 text-green-700' },
  LOI: { label: 'Lỗi', color: 'bg-red-100 text-red-700' },
  CANH_BAO: { label: 'Cảnh báo', color: 'bg-yellow-100 text-yellow-700' },
  BAO_TRI: { label: 'Bảo trì', color: 'bg-blue-100 text-blue-700' },
};

const emptyForm = {
  name: '',
  type: '',
  brand: '',
  model: '',
  serial: '',
  department: '',
  owner: '',
  purchaseDate: '',
  warrantyUntil: '',
  status: 'TOT',
  note: '',
};

export default function DevicesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'ADMIN' || role === 'TECH';

  const [items, setItems] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Borrow log ──
  const [borrowDevice, setBorrowDevice] = useState<Device | null>(null);
  const [borrowLogs, setBorrowLogs] = useState<BorrowLog[]>([]);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowNote, setBorrowNote] = useState('');
  const [borrowSaving, setBorrowSaving] = useState(false);

  const openBorrowModal = async (d: Device) => {
    setBorrowDevice(d); setBorrowLoading(true); setBorrowLogs([]);
    setBorrowerName(''); setBorrowNote('');
    try {
      const res = await api.get(`/borrow/${d.id}`);
      setBorrowLogs(res.data.items);
    } catch { /* ignore */ } finally { setBorrowLoading(false); }
  };

  const handleAddBorrow = async (e: FormEvent) => {
    e.preventDefault(); if (!borrowDevice || !borrowerName.trim()) return;
    setBorrowSaving(true);
    try {
      await api.post('/borrow', {
        deviceId: borrowDevice.id,
        borrowerName: borrowerName.trim(),
        borrowedAt: new Date().toISOString(),
        note: borrowNote || null,
      });
      const res = await api.get(`/borrow/${borrowDevice.id}`);
      setBorrowLogs(res.data.items); setBorrowerName(''); setBorrowNote('');
    } catch { /* ignore */ } finally { setBorrowSaving(false); }
  };

  const handleReturn = async (logId: string) => {
    if (!borrowDevice) return;
    await api.patch(`/borrow/${logId}/return`, {});
    const res = await api.get(`/borrow/${borrowDevice.id}`);
    setBorrowLogs(res.data.items);
  };

  const fetchDevices = async () => {
    try {
      const params: any = {};
      if (search) params.q = search;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/devices', { params });
      setItems(res.data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [search, filterStatus]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join', 'devices');
    socket.on('devices:changed', () => fetchDevices());
    return () => { socket.off('devices:changed'); };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError('');
    setShowModal(true);
  };

  const openEdit = (d: Device) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      type: d.type,
      brand: d.brand || '',
      model: d.model || '',
      serial: d.serial || '',
      department: d.department || '',
      owner: d.owner || '',
      purchaseDate: d.purchaseDate ? d.purchaseDate.slice(0, 10) : '',
      warrantyUntil: d.warrantyUntil ? d.warrantyUntil.slice(0, 10) : '',
      status: d.status,
      note: d.note || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/devices/${editingId}`, form);
      } else {
        await api.post('/devices', form);
      }
      setShowModal(false);
      fetchDevices();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể lưu. Thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa thiết bị này?')) return;
    try {
      await api.delete(`/devices/${id}`);
      fetchDevices();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quản lý thiết bị</h2>
        {canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Thêm mới
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="TOT">Tốt</option>
          <option value="LOI">Lỗi</option>
          <option value="CANH_BAO">Cảnh báo</option>
          <option value="BAO_TRI">Bảo trì</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-400 text-center py-10">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-10">Không có thiết bị nào.</p>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium">Tên</th>
                <th className="text-left px-4 py-3 font-medium">Loại</th>
                <th className="text-left px-4 py-3 font-medium">Hãng</th>
                <th className="text-left px-4 py-3 font-medium">Phòng ban</th>
                <th className="text-left px-4 py-3 font-medium">Phụ trách</th>
                <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const st = statusMap[d.status] || { label: d.status, color: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={d.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3">{d.type}</td>
                    <td className="px-4 py-3">{d.brand || '—'}</td>
                    <td className="px-4 py-3">{d.department || '—'}</td>
                    <td className="px-4 py-3">{d.owner || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                        <button onClick={() => openBorrowModal(d)} className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title="Lịch sử mượn">
                          <BookOpen size={15} />
                        </button>
                        {canEdit && <>
                          <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Sửa">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Xóa">
                            <Trash2 size={15} />
                          </button>
                        </>}
                      </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Borrow Log Modal ── */}
      {borrowDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-blue-500" />
                <div>
                  <h3 className="font-semibold">Lịch sử mượn</h3>
                  <p className="text-xs text-gray-500">{borrowDevice.name}</p>
                </div>
              </div>
              <button onClick={() => setBorrowDevice(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={16} /></button>
            </div>

            {/* Add borrow form */}
            {canEdit && (
              <form onSubmit={handleAddBorrow} className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10 space-y-2">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Ghi nhận mượn mới</p>
                <div className="flex gap-2">
                  <input required value={borrowerName} onChange={e => setBorrowerName(e.target.value)}
                    placeholder="Tên người mượn *"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={borrowNote} onChange={e => setBorrowNote(e.target.value)}
                    placeholder="Ghi chú"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={borrowSaving || !borrowerName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  <Plus size={14} /> {borrowSaving ? 'Đang lưu...' : 'Ghi nhận mượn'}
                </button>
              </form>
            )}

            {/* History list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {borrowLoading ? (
                <p className="text-center text-gray-400 py-6">Đang tải...</p>
              ) : borrowLogs.length === 0 ? (
                <p className="text-center text-gray-400 py-6">Chưa có lịch sử mượn nào.</p>
              ) : borrowLogs.map(log => (
                <div key={log.id} className={`flex items-start gap-3 p-3 rounded-xl border ${log.isReturned ? 'border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10' : 'border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10'}`}>
                  <div className="mt-0.5">
                    {log.isReturned
                      ? <CheckCircle size={18} className="text-green-500" />
                      : <RotateCcw size={18} className="text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{log.borrowerName}</p>
                    <p className="text-xs text-gray-500">Mượn: {new Date(log.borrowedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    {log.isReturned && log.returnedAt && (
                      <p className="text-xs text-green-600">Trả: {new Date(log.returnedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    )}
                    {log.note && <p className="text-xs text-gray-400 italic mt-0.5">{log.note}</p>}
                  </div>
                  {!log.isReturned && canEdit && (
                    <button onClick={() => handleReturn(log.id)}
                      className="shrink-0 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                      Đã trả
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 pb-5 pt-2">
              <button onClick={() => setBorrowDevice(null)}
                className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingId ? 'Sửa thiết bị' : 'Thêm thiết bị'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Tên thiết bị *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Loại thiết bị *</label>
                  <input required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Hãng</label>
                  <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Model</label>
                  <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Serial</label>
                  <input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Phòng ban</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Người phụ trách</label>
                  <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Ngày mua</label>
                  <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Bảo hành đến</label>
                  <input type="date" value={form.warrantyUntil} onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="TOT">Tốt</option>
                    <option value="LOI">Lỗi</option>
                    <option value="CANH_BAO">Cảnh báo</option>
                    <option value="BAO_TRI">Bảo trì</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Ghi chú</label>
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium">
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
