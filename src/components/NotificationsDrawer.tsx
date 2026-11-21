import { Bell, CheckCheck, X } from 'lucide-react';
import { formatMatchDateTime } from '../lib/validation';
import { markAllNotificationsRead, markNotificationRead } from '../services/esportsService';
import { AppNotification } from '../types/esports';

interface NotificationsDrawerProps {
  open: boolean;
  notifications: AppNotification[];
  onClose: () => void;
}

export function NotificationsDrawer({
  open,
  notifications,
  onClose,
}: NotificationsDrawerProps) {
  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
    >
      <div className="glass-card w-full max-w-md h-full flex flex-col border-l border-white/10">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#FF6B1A]" />
            <h2 className="font-display text-xl font-bold text-white">
              Notifications
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead(notifications)}
                className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-[#38BDF8] flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Notifications"
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No notifications yet</p>
              <p className="text-xs text-slate-500">
                Room Pass alerts, registrations, and wallet updates appear here in real time.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read) markNotificationRead(n.id);
                }}
                className={`w-full text-left rounded-xl p-4 border transition-colors ${
                  n.read
                    ? 'bg-white/[0.02] border-white/5 text-slate-400'
                    : 'bg-[#FF6B1A]/10 border-[#FF6B1A]/30 text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                  <span className="font-semibold text-[#FF6B1A]">{n.category}</span>
                  <span className="text-slate-400">{formatMatchDateTime(n.createdAt)}</span>
                </div>
                <p className="text-sm font-semibold text-white">{n.title}</p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
