import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, CheckCircle, AlertTriangle, X, Loader2 } from 'lucide-react';

type UpdateEvent =
  | { type: 'checking' }
  | { type: 'not-available' }
  | { type: 'available'; version: string }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded' }
  | { type: 'error'; message: string };

export default function UpdateBar() {
  const [event, setEvent]       = useState<UpdateEvent | null>(null);
  const [dismissed, setDismiss] = useState(false);

  const api = (window as any).electronAPI;
  const isElectron = !!api?.isElectron;

  useEffect(() => {
    if (!isElectron) return;
    api.onUpdater((data: UpdateEvent) => {
      if (data.type === 'not-available' || data.type === 'checking') return;
      setEvent(data);
      setDismiss(false);
    });
    return () => api.offUpdater?.();
  }, [isElectron]);

  const handleDownload = useCallback(() => {
    api?.updaterDownload?.();
    setEvent({ type: 'progress', percent: 0 });
  }, [api]);

  const handleInstall = useCallback(() => {
    api?.updaterInstall?.();
  }, [api]);

  if (!isElectron || dismissed || !event) return null;

  /* ─── Available ─── */
  if (event.type === 'available') return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 bg-primary-700 text-white rounded-xl shadow-2xl px-4 py-3 max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Có phiên bản mới — v{event.version}</p>
        <p className="text-xs text-primary-200 mt-0.5">Cập nhật để nhận tính năng mới nhất</p>
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-primary-700 rounded-lg text-xs font-bold hover:bg-primary-50 shrink-0 transition-colors"
      >
        <Download size={13} /> Tải về
      </button>
      <button onClick={() => setDismiss(true)} className="p-1 rounded hover:bg-primary-600 text-primary-200 shrink-0">
        <X size={14} />
      </button>
    </div>
  );

  /* ─── Downloading ─── */
  if (event.type === 'progress') return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 w-72">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 size={14} className="animate-spin text-primary-400 shrink-0" />
        <p className="text-sm font-semibold">Đang tải bản cập nhật…</p>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${event.percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-right">{event.percent}%</p>
    </div>
  );

  /* ─── Downloaded ─── */
  if (event.type === 'downloaded') return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 bg-green-700 text-white rounded-xl shadow-2xl px-4 py-3 max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <CheckCircle size={18} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Sẵn sàng cài đặt</p>
        <p className="text-xs text-green-200 mt-0.5">Bấm cài đặt để khởi động lại và cập nhật</p>
      </div>
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 rounded-lg text-xs font-bold hover:bg-green-50 shrink-0 transition-colors"
      >
        <RefreshCw size={13} /> Cài đặt
      </button>
    </div>
  );

  /* ─── Error ─── */
  if (event.type === 'error') return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 bg-red-700 text-white rounded-xl shadow-2xl px-4 py-3 max-w-sm">
      <AlertTriangle size={18} className="shrink-0" />
      <p className="text-xs flex-1 min-w-0 truncate">Lỗi cập nhật: {event.message}</p>
      <button onClick={() => setDismiss(true)} className="p-1 rounded hover:bg-red-600 shrink-0">
        <X size={14} />
      </button>
    </div>
  );

  return null;
}
