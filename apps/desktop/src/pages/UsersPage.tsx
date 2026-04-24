import { useEffect, useState, FormEvent } from 'react';
import { Users, Plus, Pencil, Trash2, X, KeyRound, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type User = {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'TECH' | 'VIEW';
  isActive: boolean;
  createdAt: string;
};

const roleMap: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Quản trị viên', color: 'bg-red-100 text-red-700' },
  TECH: { label: 'Kỹ thuật viên', color: 'bg-blue-100 text-blue-700' },
  VIEW: { label: 'Chỉ xem', color: 'bg-gray-100 text-gray-700' },
};

const emptyForm = { username: '', password: '', fullName: '', role: 'TECH' as 'ADMIN' | 'TECH' | 'VIEW' };
const emptyPwdForm = { newPassword: '', confirm: '' };

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdTargetId, setPwdTargetId] = useState('');
  const [pwdTargetName, setPwdTargetName] = useState('');
  const [pwdForm, setPwdForm] = useState({ ...emptyPwdForm });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError(''); setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ username: u.username, password: '', fullName: u.fullName, role: u.role });
    setError(''); setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, { fullName: form.fullName, role: form.role });
      } else {
        if (!form.password || form.password.length < 6) {
          setError('Mật khẩu tối thiểu 6 ký tự.'); setSaving(false); return;
        }
        await api.post('/users', { username: form.username, password: form.password, fullName: form.fullName, role: form.role });
      }
      setShowModal(false); fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể lưu. Thử lại.');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (u: User) => {
    if (u.id === currentUser?.id) return;
    const msg = u.isActive ? `Vô hiệu hóa tài khoản "${u.fullName}"?` : `Kích hoạt lại tài khoản "${u.fullName}"?`;
    if (!confirm(msg)) return;
    await api.put(`/users/${u.id}`, { isActive: !u.isActive });
    fetchUsers();
  };

  const openPwd = (u: User) => {
    setPwdTargetId(u.id);
    setPwdTargetName(u.fullName);
    setPwdForm({ ...emptyPwdForm });
    setPwdError(''); setShowPwdModal(true);
  };

  const handleChangePwd = async (e: FormEvent) => {
    e.preventDefault(); setPwdSaving(true); setPwdError('');
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdError('Mật khẩu xác nhận không khớp.'); setPwdSaving(false); return;
    }
    try {
      await api.put(`/users/${pwdTargetId}/password`, { newPassword: pwdForm.newPassword });
      setShowPwdModal(false);
    } catch (err: any) {
      setPwdError(err?.response?.data?.message || 'Không thể đổi mật khẩu.');
    } finally { setPwdSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Quản lý người dùng</h2>
            <p className="text-sm text-gray-500">{users.filter(u => u.isActive).length} tài khoản đang hoạt động</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Thêm tài khoản
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-10">Đang tải...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Họ tên</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Tài khoản</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Quyền hạn</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Trạng thái</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Ngày tạo</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const r = roleMap[u.role];
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className={`border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!u.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{u.fullName}</span>
                        {isSelf && <span className="text-xs text-gray-400">(bạn)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} title="Sửa thông tin" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => openPwd(u)} title="Đổi mật khẩu" className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-400">
                          <KeyRound size={14} />
                        </button>
                        {!isSelf && (
                          <button onClick={() => handleToggleActive(u)} title={u.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                            className={`p-1.5 rounded ${u.isActive ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400' : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500'}`}>
                            {u.isActive ? <Trash2 size={14} /> : <ShieldCheck size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal tạo / sửa tài khoản */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingId ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
            </div>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Họ và tên *</label>
                <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              {!editingId && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1">Tên đăng nhập * (chữ thường, số, dấu _)</label>
                    <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })}
                      pattern="^[a-z0-9_]+$" minLength={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Mật khẩu * (tối thiểu 6 ký tự)</label>
                    <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium mb-1">Quyền hạn</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="ADMIN">Quản trị viên — toàn quyền</option>
                  <option value="TECH">Kỹ thuật viên — thêm/sửa dữ liệu</option>
                  <option value="VIEW">Chỉ xem — không được chỉnh sửa</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal đổi mật khẩu */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Đổi mật khẩu — {pwdTargetName}</h3>
              <button onClick={() => setShowPwdModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
            </div>
            {pwdError && <p className="text-sm text-red-500 mb-3">{pwdError}</p>}
            <form onSubmit={handleChangePwd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Mật khẩu mới *</label>
                <input required type="password" minLength={6} value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Xác nhận mật khẩu *</label>
                <input required type="password" minLength={6} value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPwdModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600">Hủy</button>
                <button type="submit" disabled={pwdSaving} className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium">
                  {pwdSaving ? 'Đang lưu...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
