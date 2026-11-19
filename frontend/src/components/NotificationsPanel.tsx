import { useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationsContext";

export default function NotificationsPanel() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications();
  const navigate = useNavigate();

  if (!notifications || notifications.length === 0) {
    return (
      <div className="w-80 glass-panel border border-brand-border/60 rounded-xl shadow-lg p-4">
        <p className="text-sm text-brand-text-muted">No notifications</p>
      </div>
    );
  }

  return (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-brand-card border border-brand-border/60 rounded-xl shadow-xl p-2">
      <div className="px-3 py-2 border-b border-brand-border/40 flex items-center justify-between">
        <strong className="text-sm text-brand-text">Notifications</strong>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-brand-primary hover:underline cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>
      <ul className="max-h-72 overflow-auto">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`px-3 py-2.5 rounded-lg hover:bg-brand-bg/60 flex items-start gap-2 cursor-pointer ${
              n.read ? "opacity-60" : ""
            }`}
            onClick={() => {
              markRead(n.id);
              if (n.scanId) navigate(`/scans/${n.scanId}`);
            }}
          >
            {!n.read && (
              <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-primary shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-brand-text break-words">{n.message}</div>
              {n.time && (
                <div className="text-[11px] text-brand-text-muted mt-1">{n.time}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
