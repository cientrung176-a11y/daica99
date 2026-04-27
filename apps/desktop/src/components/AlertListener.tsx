import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import { WifiOff, X } from 'lucide-react';

type OfflineAlert = {
  id: string;
  name: string;
  location: string | null;
  at: number;
};

export default function AlertListener() {
  const [alerts, setAlerts] = useState<OfflineAlert[]>([]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join', 'computers');

    const handler = (data: { id: string; name: string; location: string | null }) => {
      const alert: OfflineAlert = { ...data, at: Date.now() };

      setAlerts(prev => {
        if (prev.find(a => a.id === data.id)) return prev;
        return [...prev, alert];
      });

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚠️ Máy tính offline', {
          body: `${data.name}${data.location ? ` — ${data.location}` : ''} đã mất kết nối.`,
          icon: '/icon.png',
        });
      } else if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification('⚠️ Máy tính offline', {
              body: `${data.name} đã mất kết nối.`,
            });
          }
        });
      }
    };

    socket.on('computer:offline', handler);
    return () => { socket.off('computer:offline', handler); };
  }, []);

  const dismiss = (id: string) =>
    setAlerts(prev => prev.filter(a => a.id !== id));

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-xs w-full">
      {alerts.map(a => (
        <div key={a.id}
          className="flex items-start gap-3 bg-red-600 text-white rounded-xl px-4 py-3 shadow-xl animate-fade-in">
          <WifiOff size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{a.name}</p>
            {a.location && <p className="text-xs text-red-200 truncate">{a.location}</p>}
            <p className="text-xs text-red-200 mt-0.5">Mất kết nối</p>
          </div>
          <button onClick={() => dismiss(a.id)}
            className="p-0.5 rounded hover:bg-red-500 text-red-200 hover:text-white shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
