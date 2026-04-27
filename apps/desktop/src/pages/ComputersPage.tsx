import { useEffect, useState, useRef, FormEvent } from 'react';
import {
  Monitor, Plus, Pencil, Trash2, Search, X, Copy, Download, RefreshCw,
  Eye, EyeOff, ShieldCheck, ExternalLink, QrCode, Printer,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';

type Computer = {
  id: string;
  machineId: string | null;
  name: string;
  ipInternal: string | null;
  ipPublic: string | null;
  mac: string | null;
  location: string | null;
  currentUser: string | null;
  windows: string | null;
  cpu: string | null;
  ram: string | null;
  disk: string | null;
  antivirus: string | null;
  note: string | null;
  rustDeskId: string | null;
  hasRustdesk: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  cpuPercent: number | null;
  ramPercent: number | null;
  pingMs: number | null;
};

type RevealedRustdesk = { rdId: string; rdPass: string; expiresAt: number };

const emptyForm = {
  name: '', ipInternal: '', ipPublic: '', mac: '',
  location: '', currentUser: '', windows: '', cpu: '',
  ram: '', disk: '', antivirus: '', note: '',
};

function openExternalUrl(url: string) {
  const ea = (window as any).electronAPI;
  if (ea?.openExternal) { ea.openExternal(url); } else { window.open(url, '_blank'); }
}

export default function ComputersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'ADMIN' || role === 'TECH';
  const isAdmin = role === 'ADMIN';

  const [items, setItems] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [rdIdInput, setRdIdInput] = useState('');
  const [rdPassInput, setRdPassInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copyMsg, setCopyMsg] = useState('');
  const [qrModal, setQrModal] = useState<Computer | null>(null);

  // ── RustDesk: PIN modal ──
  const [pinModal, setPinModal] = useState<{ id: string; name: string } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinLockUntil, setPinLockUntil] = useState<number | null>(null);
  const [pinLockSec, setPinLockSec] = useState(0);
  const pinRef = useRef<HTMLInputElement>(null);

  // ── RustDesk: revealed data (in-memory, auto-expire 60s) ──
  const [revealed, setRevealed] = useState<Record<string, RevealedRustdesk>>({});

  const fetchData = async () => {
    try {
      const res = await api.get('/computers', { params: search ? { q: search } : {} });
      setItems(res.data.items);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join', 'computers');
    socket.on('computers:changed', () => fetchData());
    return () => { socket.off('computers:changed'); };
  }, []);

  // Auto-expire revealed data
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRevealed(prev => {
        const next = { ...prev };
        let changed = false;
        for (const k of Object.keys(next)) {
          if (next[k].expiresAt < now) { delete next[k]; changed = true; }
        }
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!pinLockUntil) return;
    const timer = setInterval(() => {
      const remaining = Math.ceil((pinLockUntil - Date.now()) / 1000);
      if (remaining <= 0) { setPinLockUntil(null); setPinLockSec(0); }
      else { setPinLockSec(remaining); }
    }, 1000);
    return () => clearInterval(timer);
  }, [pinLockUntil]);

  const openCreate = () => {
    setEditingId(null); setForm({ ...emptyForm });
    setRdIdInput(''); setRdPassInput('');
    setError(''); setShowModal(true);
  };

  const openEdit = (c: Computer) => {
    setEditingId(c.id);
    setForm({
      name: c.name, ipInternal: c.ipInternal || '', ipPublic: c.ipPublic || '',
      mac: c.mac || '', location: c.location || '', currentUser: c.currentUser || '',
      windows: c.windows || '', cpu: c.cpu || '', ram: c.ram || '',
      disk: c.disk || '', antivirus: c.antivirus || '', note: c.note || '',
    });
    setRdIdInput(c.rustDeskId || '');
    setRdPassInput('');
    setError(''); setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      let savedId = editingId;
      if (editingId) {
        await api.put(`/computers/${editingId}`, form);
      } else {
        const res = await api.post('/computers', form);
        savedId = res.data.item.id;
      }
      if (savedId && isAdmin && (rdIdInput || rdPassInput)) {
        await api.put(`/computers/${savedId}/rustdesk`, {
          rustdeskId: rdIdInput || null,
          rustdeskPassword: rdPassInput || undefined,
        });
      }
      setShowModal(false); fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể lưu. Thử lại.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa máy tính này?')) return;
    await api.delete(`/computers/${id}`);
    fetchData();
  };

  const copyText = (text: string, label = 'Đã sao chép!') => {
    navigator.clipboard.writeText(text);
    setCopyMsg(label);
    setTimeout(() => setCopyMsg(''), 1800);
  };

  const handleExport = () => {
    const base = localStorage.getItem('serverUrl')
      || (import.meta.env.PROD ? 'https://daica99-api.onrender.com' : 'http://localhost:4000');
    const token = localStorage.getItem('accessToken') || '';
    const url = `${base}/api/export/computers`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `may-tinh-${Date.now()}.xlsx`;
        a.click();
      });
  };

  // ── RustDesk PIN handlers ──
  const openPinModal = (c: Computer) => {
    setPinModal({ id: c.id, name: c.name });
    setPinInput(''); setPinError('');
    if (!pinLockUntil) setTimeout(() => pinRef.current?.focus(), 100);
  };

  const handlePinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pinModal || pinLockUntil) return;
    setPinLoading(true); setPinError('');
    try {
      const res = await api.post(`/computers/${pinModal.id}/rustdesk/reveal`, { pin: pinInput });
      setRevealed(prev => ({
        ...prev,
        [pinModal.id]: { rdId: res.data.rustdeskId || '', rdPass: res.data.rustdeskPassword || '', expiresAt: Date.now() + 60_000 },
      }));
      setPinModal(null); setPinInput('');
    } catch (err: any) {
      const data = err?.response?.data;
      if (err?.response?.status === 429 && data?.lockedUntil) {
        setPinLockUntil(data.lockedUntil);
        setPinLockSec(Math.ceil((data.lockedUntil - Date.now()) / 1000));
        setPinError('');
      } else {
        setPinError(data?.message || 'Xác thực thất bại.');
      }
    } finally { setPinLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Quản lý máy tính</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng: <span className="font-semibold text-gray-700 dark:text-gray-300">{items.length} máy</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchData} className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500" title="Làm mới">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download size={16} /> Xuất Excel
          </button>
          {canEdit && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
              <Plus size={16} /> Thêm máy
            </button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên máy, IP, vị trí..."
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {copyMsg && <p className="text-xs text-green-600">{copyMsg}</p>}

      {loading ? (
        <p className="text-gray-400 text-center py-10">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-10">Chưa có máy tính nào. Bấm "Thêm máy" để bắt đầu.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map((c) => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">

              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.isOnline ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                    <Monitor size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</h3>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${c.isOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        {c.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {c.location && <p className="text-xs text-gray-500 truncate">{c.location}</p>}
                    {c.isOnline && c.lastSeenAt && (
                      <p className="text-xs text-gray-400">
                        {c.pingMs != null && <span className="mr-2">🏓 {c.pingMs}ms</span>}
                        Cập nhật: {new Date(c.lastSeenAt).toLocaleTimeString('vi-VN')}
                      </p>
                    )}
                    {!c.isOnline && c.lastSeenAt && (
                      <p className="text-xs text-gray-400">Lần cuối: {new Date(c.lastSeenAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => setQrModal(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-emerald-600" title="QR Code"><QrCode size={14} /></button>
                    {canEdit && <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700" title="Sửa"><Pencil size={14} /></button>}
                    {isAdmin && <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400" title="Xóa"><Trash2 size={14} /></button>}
                  </div>
              </div>

              {/* CPU / RAM bars */}
              {c.isOnline && (c.cpuPercent != null || c.ramPercent != null) && (
                <div className="grid grid-cols-2 gap-3">
                  {c.cpuPercent != null && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>CPU</span><span className={c.cpuPercent > 85 ? 'text-red-500 font-semibold' : ''}>{c.cpuPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${c.cpuPercent > 85 ? 'bg-red-500' : c.cpuPercent > 60 ? 'bg-amber-400' : 'bg-green-500'}`}
                          style={{ width: `${c.cpuPercent}%` }} />
                      </div>
                    </div>
                  )}
                  {c.ramPercent != null && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>RAM</span><span className={c.ramPercent > 85 ? 'text-red-500 font-semibold' : ''}>{c.ramPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${c.ramPercent > 85 ? 'bg-red-500' : c.ramPercent > 60 ? 'bg-amber-400' : 'bg-blue-500'}`}
                          style={{ width: `${c.ramPercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {c.ipInternal && (
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className="text-gray-400 text-xs">IP:</span>
                    <span className="font-mono font-medium text-xs">{c.ipInternal}</span>
                    <button onClick={() => copyText(c.ipInternal!, 'Đã sao chép IP!')} className="text-gray-300 hover:text-gray-500 ml-0.5"><Copy size={10} /></button>
                  </div>
                )}
                {c.currentUser && <div className="text-xs"><span className="text-gray-400">Người dùng: </span><span className="font-medium">{c.currentUser}</span></div>}
                {c.windows    && <div className="text-xs"><span className="text-gray-400">OS: </span><span className="font-medium">{c.windows}</span></div>}
                {c.cpu        && <div className="text-xs col-span-2"><span className="text-gray-400">CPU: </span><span className="font-medium">{c.cpu}</span></div>}
                {c.ram        && <div className="text-xs"><span className="text-gray-400">RAM: </span><span className="font-medium">{c.ram}</span></div>}
                {c.disk       && <div className="text-xs"><span className="text-gray-400">Ổ cứng: </span><span className="font-medium">{c.disk}</span></div>}
                {c.mac        && <div className="text-xs col-span-2"><span className="text-gray-400">MAC: </span><span className="font-mono font-medium">{c.mac}</span></div>}
                {c.note       && <div className="text-xs col-span-2 text-gray-400 italic">{c.note}</div>}
              </div>

              {/* RustDesk Panel (Admin only) */}
              {isAdmin && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <ShieldCheck size={12} /> RustDesk
                    </span>
                    {c.hasRustdesk && (
                      revealed[c.id] ? (
                        <button onClick={() => setRevealed(prev => { const n = { ...prev }; delete n[c.id]; return n; })}
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <EyeOff size={12} /> Ẩn
                        </button>
                      ) : (
                        <button onClick={() => openPinModal(c)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium">
                          <Eye size={12} /> Xem
                        </button>
                      )
                    )}
                  </div>

                  {!c.hasRustdesk ? (
                    <p className="text-xs text-gray-400 italic">Chưa cấu hình — chỉnh sửa máy để thêm RustDesk</p>
                  ) : revealed[c.id] ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-500 w-10 shrink-0">ID:</span>
                        <span className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-100 flex-1 select-all">{revealed[c.id].rdId || '—'}</span>
                        {revealed[c.id].rdId && <button onClick={() => copyText(revealed[c.id].rdId, 'Đã sao chép ID!')} className="text-gray-400 hover:text-gray-700 shrink-0"><Copy size={12} /></button>}
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-500 w-10 shrink-0">Pass:</span>
                        <span className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-100 flex-1 select-all">{revealed[c.id].rdPass || '—'}</span>
                        {revealed[c.id].rdPass && <button onClick={() => copyText(revealed[c.id].rdPass, 'Đã sao chép mật khẩu!')} className="text-gray-400 hover:text-gray-700 shrink-0"><Copy size={12} /></button>}
                      </div>
                      <div className="flex items-center gap-3">
                        {revealed[c.id].rdId && (
                          <button onClick={() => openExternalUrl(`rustdesk://${revealed[c.id].rdId}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                            <ExternalLink size={11} /> Mở RustDesk
                          </button>
                        )}
                        <span className="text-xs text-amber-500">⏱ Tự ẩn sau 60s</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400"><span className="w-9">ID:</span><span className="font-mono tracking-widest">••••••••••</span></div>
                      <div className="flex items-center gap-2 text-xs text-gray-400"><span className="w-9">Pass:</span><span className="font-mono tracking-widest">••••••••</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── QR Code Modal ── */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-emerald-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">QR Code thiết bị</h3>
              </div>
              <button onClick={() => setQrModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4" id="qr-print-area">
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                <QRCodeSVG
                  value={[
                    `Tên: ${qrModal.name}`,
                    qrModal.ipInternal ? `IP: ${qrModal.ipInternal}` : '',
                    qrModal.location   ? `Phòng: ${qrModal.location}` : '',
                    qrModal.currentUser ? `Người dùng: ${qrModal.currentUser}` : '',
                    qrModal.cpu        ? `CPU: ${qrModal.cpu}` : '',
                    qrModal.ram        ? `RAM: ${qrModal.ram}` : '',
                    qrModal.antivirus  ? `AV: ${qrModal.antivirus}` : '',
                  ].filter(Boolean).join('\n')}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-gray-100">{qrModal.name}</p>
                {qrModal.location && <p className="text-sm text-gray-500">{qrModal.location}</p>}
                {qrModal.ipInternal && <p className="text-xs font-mono text-gray-400">{qrModal.ipInternal}</p>}
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={() => setQrModal(null)}
                className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Đóng</button>
              <button
                onClick={() => {
                  const w = window.open('', '_blank', 'width=400,height=500')!;
                  const svgEl = document.querySelector('#qr-print-area svg');
                  const svgStr = svgEl ? svgEl.outerHTML : '';
                  w.document.write(`<html><head><title>QR - ${qrModal.name}</title><style>body{font-family:sans-serif;text-align:center;padding:32px}svg{display:block;margin:0 auto 16px}h2{margin:0 0 4px}p{margin:2px;color:#666;font-size:13px}@media print{button{display:none}}</style></head><body>${svgStr}<h2>${qrModal.name}</h2>${qrModal.location ? `<p>${qrModal.location}</p>` : ''}${qrModal.ipInternal ? `<p style="font-family:monospace">${qrModal.ipInternal}</p>` : ''}<br><button onclick="window.print()">🖨️ In</button></body></html>`);
                  w.document.close();
                  setTimeout(() => w.print(), 300);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                <Printer size={14} /> In QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PIN Verification Modal ── */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Xác thực bảo mật</h3>
                <p className="text-xs text-gray-500 truncate">{pinModal.name}</p>
              </div>
              <button onClick={() => setPinModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={16} /></button>
            </div>
            <form onSubmit={handlePinSubmit} className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Nhập mã PIN quản trị để xem thông tin RustDesk.</p>
              {pinLockUntil ? (
                <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="text-3xl font-bold text-red-600 tabular-nums min-w-[3rem] text-center">{pinLockSec}s</div>
                  <p className="text-sm text-red-700 dark:text-red-400 leading-snug">
                    Nhập sai quá nhiều lần.<br />
                    Vui lòng thử lại sau <span className="font-semibold">{Math.floor(pinLockSec / 60) > 0 ? `${Math.floor(pinLockSec / 60)}p${pinLockSec % 60}s` : `${pinLockSec}s`}</span>.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Mã PIN</label>
                  <input ref={pinRef} type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
                    placeholder="••••••" autoComplete="off"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-amber-500 text-center tracking-[0.4em] font-mono text-lg" />
                  {pinError && <p className="text-xs text-red-500 mt-1.5">{pinError}</p>}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setPinModal(null)}
                  className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Hủy</button>
                <button type="submit" disabled={pinLoading || !pinInput || !!pinLockUntil}
                  className="flex-1 px-4 py-2 text-sm rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium">
                  {pinLoading ? 'Đang xác thực...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingId ? 'Sửa máy tính' : 'Thêm máy tính'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
            </div>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['name', 'Tên máy *', true], ['ipInternal', 'IP nội bộ', false],
                  ['location', 'Vị trí / Phòng', false], ['currentUser', 'Người dùng', false],
                  ['windows', 'Hệ điều hành', false], ['cpu', 'CPU', false],
                  ['ram', 'RAM', false], ['disk', 'Ổ cứng', false],
                  ['antivirus', 'Antivirus', false], ['mac', 'Địa chỉ MAC', false],
                ] as [keyof typeof form, string, boolean][]).map(([key, label, req]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1">{label}</label>
                    <input required={req} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Ghi chú</label>
                  <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                </div>
              </div>

              {/* RustDesk section — Admin only */}
              {isAdmin && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <ShieldCheck size={13} /> RustDesk
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">RustDesk ID</label>
                      <input value={rdIdInput} onChange={e => setRdIdInput(e.target.value)}
                        placeholder="VD: 123456789"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Mật khẩu RustDesk</label>
                      <input type="password" value={rdPassInput} onChange={e => setRdPassInput(e.target.value)}
                        placeholder={editingId ? 'Để trống = giữ nguyên' : 'Nhập mật khẩu'}
                        autoComplete="new-password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                  </div>
                  {editingId && <p className="text-xs text-blue-500">Để trống mật khẩu = giữ mật khẩu RustDesk hiện tại</p>}
                </div>
              )}

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
    </div>
  );
}
