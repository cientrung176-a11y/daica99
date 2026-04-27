import { useState, useEffect, FormEvent } from 'react';
import { Save, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'ADMIN';

  const [clinicName, setClinicName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [syncInterval, setSyncInterval] = useState('30');
  const [darkMode, setDarkMode] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [saved, setSaved] = useState(false);

  // PIN management
  const [pinCurrent, setPinCurrent]   = useState('');
  const [pinNew, setPinNew]           = useState('');
  const [pinConfirm, setPinConfirm]   = useState('');
  const [pinSaving, setPinSaving]     = useState(false);
  const [pinMsg, setPinMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [showPins, setShowPins]       = useState(false);

  useEffect(() => {
    setClinicName(localStorage.getItem('clinicName') || 'Phòng khám Đại Ca 99');
    const defaultUrl = import.meta.env.PROD
      ? 'https://daica99-api.onrender.com'
      : 'http://localhost:4000';
    setServerUrl(localStorage.getItem('serverUrl') || defaultUrl);
    setSyncInterval(localStorage.getItem('syncInterval') || '30');
    setDarkMode(document.documentElement.classList.contains('dark'));
    const ea = (window as any).electronAPI;
    if (ea?.getAutoStart) ea.getAutoStart().then((v: boolean) => setAutoStart(v));
  }, []);

  const handleSave = () => {
    localStorage.setItem('clinicName', clinicName);
    localStorage.setItem('serverUrl', serverUrl);
    localStorage.setItem('syncInterval', syncInterval);

    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // Ghi settings.json để Electron main process (heartbeat agent) đọc serverUrl
    try {
      const w = (window as any);
      if (w.electronAPI?.saveSettings) {
        w.electronAPI.saveSettings({ serverUrl, clinicName });
      }
    } catch { /* chạy trên web — bỏ qua */ }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePinChange = async (e: FormEvent) => {
    e.preventDefault();
    if (pinNew.length < 4) { setPinMsg({ ok: false, text: 'PIN mới phải có ít nhất 4 ký tự.' }); return; }
    if (pinNew !== pinConfirm) { setPinMsg({ ok: false, text: 'PIN mới không khớp.' }); return; }
    setPinSaving(true); setPinMsg(null);
    try {
      await api.put('/settings/admin-pin', { currentPin: pinCurrent, newPin: pinNew });
      setPinMsg({ ok: true, text: 'Đổi PIN thành công!' });
      setPinCurrent(''); setPinNew(''); setPinConfirm('');
    } catch (err: any) {
      setPinMsg({ ok: false, text: err?.response?.data?.message || 'Không thể đổi PIN.' });
    } finally { setPinSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Cài đặt</h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Tên phòng khám</label>
          <input
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Địa chỉ server (URL)</label>
          <input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://your-server.com:4000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1">Thay đổi URL server cần khởi động lại ứng dụng.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Khoảng thời gian đồng bộ (giây)</label>
          <input
            type="number"
            value={syncInterval}
            onChange={(e) => setSyncInterval(e.target.value)}
            min="5"
            className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm">Giao diện tối</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={async (e) => {
                const newVal = e.target.checked;
                setAutoStart(newVal);
                const ea = (window as any).electronAPI;
                if (ea?.setAutoStart) {
                  const result = await ea.setAutoStart(newVal);
                  setAutoStart(result ?? newVal);
                }
              }}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm">Tự khởi động cùng Windows</span>
          </label>
          <span className="text-xs text-gray-400">(chạy ẩn nền, gửi heartbeat tự động)</span>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={16} /> Lưu cài đặt
          </button>
          {saved && <span className="text-sm text-green-600">Đã lưu!</span>}
        </div>
      </div>
      {/* PIN quản trị — Admin only */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-blue-500" />
            <h3 className="text-base font-semibold">Bảo mật RustDesk</h3>
          </div>
          <p className="text-sm text-gray-500 mb-5">PIN quản trị dùng để xác thực khi xem thông tin RustDesk. Mặc định: <span className="font-mono font-semibold">123456</span>.</p>
          <form onSubmit={handlePinChange} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {[
                ['PIN hiện tại', pinCurrent, setPinCurrent, 'current-password'],
                ['PIN mới (tối thiểu 4 ký tự)', pinNew, setPinNew, 'new-password'],
                ['Nhập lại PIN mới', pinConfirm, setPinConfirm, 'new-password'],
              ].map(([label, val, setter, ac]) => (
                <div key={label as string}>
                  <label className="block text-sm font-medium mb-1">{label as string}</label>
                  <div className="relative">
                    <input
                      type={showPins ? 'text' : 'password'}
                      value={val as string}
                      onChange={e => (setter as any)(e.target.value)}
                      autoComplete={ac as string}
                      required
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={showPins} onChange={e => setShowPins(e.target.checked)} className="rounded" />
              {showPins ? <EyeOff size={14} /> : <Eye size={14} />} Hiển thị PIN
            </label>
            <div className="flex items-center gap-4 flex-wrap">
              <button type="submit" disabled={pinSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium">
                <ShieldCheck size={15} /> {pinSaving ? 'Đang lưu...' : 'Cập nhật PIN'}
              </button>
              {pinMsg && (
                <span className={`text-sm font-medium ${pinMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{pinMsg.text}</span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
