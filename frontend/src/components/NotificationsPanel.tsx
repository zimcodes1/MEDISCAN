import { useNotifications } from "../contexts/NotificationsContext";

export default function NotificationsPanel() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications();

  if (!notifications || notifications.length === 0) {
    return (
      <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <p className="text-sm text-gray-600">No notifications</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <strong className="text-sm">Notifications</strong>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-blue-600 hover:underline cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>
      <ul className="max-h-64 overflow-auto">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`px-3 py-2 hover:bg-gray-50 flex items-start gap-2 cursor-pointer ${
              n.read ? "opacity-60" : ""
            }`}
            onClick={() => markRead(n.id)}
          >
            <div className="flex-1">
              <div className="text-sm text-gray-800">{n.message}</div>
              <div className="text-[11px] text-gray-400 mt-1">{n.time}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
