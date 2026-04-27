import axios from 'axios';

// Build-time: VITE_API_URL từ .env.production / .env.development
// Runtime override: người dùng có thể đổi trong Settings → lưu localStorage
const PROD_URL = 'https://daica99-api.onrender.com';
const DEV_URL  = 'http://localhost:4000';
const BUILD_URL: string = import.meta.env.VITE_API_URL
  ?? (import.meta.env.PROD ? PROD_URL : DEV_URL);

function getBaseUrl(): string {
  try {
    const stored = localStorage.getItem('serverUrl');
    if (stored && stored.startsWith('http')) {
      if (import.meta.env.PROD &&
          (stored.includes('localhost') || stored.includes('127.0.0.1'))) {
        localStorage.removeItem('serverUrl');
      } else {
        return stored;
      }
    }
  } catch {}
  return BUILD_URL;
}

export const api = axios.create({
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  cfg.baseURL = getBaseUrl() + '/api';
  const token = localStorage.getItem('accessToken');
  if (token && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(getBaseUrl() + '/api/auth/refresh', { refreshToken });
          const newAccess = res.data.accessToken;
          localStorage.setItem('accessToken', newAccess);
          // Cập nhật cả default header lẫn request cụ thể
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
          original.headers['Authorization'] = `Bearer ${newAccess}`;
          return api(original);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          delete api.defaults.headers.common['Authorization'];
          // Dùng replace thay vì hash — hoạt động đúng cả trên web lẫn Electron
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  },
);
