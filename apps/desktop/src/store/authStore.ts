import { create } from 'zustand';
import { api } from '../lib/api';

function setAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

function decodeJwtPayload(payloadB64: string) {
  const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

type User = {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'TECH' | 'VIEW';
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  tryRestore: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password, remember) => {
    const res = await api.post('/auth/login', { username, password, remember });
    const { user, accessToken, refreshToken } = res.data;
    localStorage.setItem('accessToken', accessToken);
    if (remember) localStorage.setItem('refreshToken', refreshToken);
    setAuthHeader(accessToken);
    set({ user, loading: false });
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAuthHeader(null);
    set({ user: null, loading: false });
  },

  tryRestore: () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const payloadB64 = token.split('.')[1];
      const payload = decodeJwtPayload(payloadB64);

      // Kiểm tra token đã hết hạn chưa (payload.exp tính bằng giây)
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowSec) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, loading: false });
        return;
      }

      setAuthHeader(token);
      set({
        user: {
          id: payload.sub,
          username: payload.username,
          fullName: payload.fullName || payload.username,
          role: payload.role,
        },
        loading: false,
      });
    } catch {
      localStorage.removeItem('accessToken');
      set({ user: null, loading: false });
    }
  },
}));
