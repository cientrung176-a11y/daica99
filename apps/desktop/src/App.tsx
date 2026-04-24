import { useEffect } from 'react';
import BrandLogo from './components/BrandLogo';
import UpdateBar from './components/UpdateBar';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import ComputersPage from './pages/ComputersPage';
import TechLogPage from './pages/TechLogPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-primary-600 to-primary-900 gap-5">
        <div className="animate-pulse">
          <BrandLogo variant="full" size={120} />
        </div>
        <p className="text-white/80 text-sm font-medium tracking-wide">Đang tải...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const tryRestore = useAuthStore((s) => s.tryRestore);

  useEffect(() => {
    tryRestore();
  }, [tryRestore]);

  return (
    <>
    <UpdateBar />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/computers" element={<ComputersPage />} />
                <Route path="/tech-log" element={<TechLogPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
}
