import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  HardDrive,
  Monitor,
  Wrench,
  Users,
  Settings,
  Info,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import BrandLogo from './BrandLogo';

const navItems = [
  { to: '/', label: 'Bảng điều khiển', icon: LayoutDashboard, roles: null },
  { to: '/devices', label: 'Thiết bị', icon: HardDrive, roles: null },
  { to: '/computers', label: 'Máy tính', icon: Monitor, roles: null },
  { to: '/tech-log', label: 'Nhật ký kỹ thuật', icon: Wrench, roles: null },
  { to: '/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
  { to: '/settings', label: 'Cài đặt', icon: Settings, roles: null },
  { to: '/about', label: 'Giới thiệu', icon: Info, roles: null },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const role = user?.role ?? '';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 shrink-0`}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo variant="mark" size={36} className="shrink-0" />
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-primary-700 dark:text-primary-400 leading-tight truncate">ĐẠI CA 99</h1>
                <p className="text-xs font-semibold text-primary-500 dark:text-primary-500 leading-tight truncate">BẮC NINH</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 shrink-0"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.filter(item => !item.roles || item.roles.includes(role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`
              }
            >
              <item.icon size={20} className="shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          {sidebarOpen && (
            <div className="mb-2 px-2">
              <p className="text-sm font-medium truncate">{user?.fullName || user?.username}</p>
              <p className="text-xs text-gray-400 capitalize">
                {user?.role === 'ADMIN'
                  ? 'Quản trị viên'
                  : user?.role === 'TECH'
                  ? 'Kỹ thuật viên'
                  : 'Chỉ xem'}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
