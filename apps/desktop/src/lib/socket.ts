import { io, Socket } from 'socket.io-client';

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

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getBaseUrl(), {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
