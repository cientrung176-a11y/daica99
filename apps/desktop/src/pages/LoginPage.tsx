import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Lock, User } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, remember);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-4">
      <div className="w-full max-w-md">
        {/* Brand header above card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <BrandLogo variant="full" size={110} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide drop-shadow">ĐẠI CA 99 BẮC NINH</h1>
          <p className="text-primary-200 text-sm mt-1">Quản lý thiết bị phòng khám</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Login title */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Đăng nhập</h2>
          </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                placeholder="Nhập tên đăng nhập"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                placeholder="Nhập mật khẩu"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Phiên bản 0.1.0
        </p>
        </div>
      </div>
    </div>
  );
}
