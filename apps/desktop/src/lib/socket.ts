import { io, Socket } from 'socket.io-client';

const BUILD_URL: string = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000';

function getBaseUrl(): string {
  try {
    const stored = localStorage.getItem('serverUrl');
    if (stored && stored.startsWith('http')) return stored;
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
