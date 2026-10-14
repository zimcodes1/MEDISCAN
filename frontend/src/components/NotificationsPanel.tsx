import { useNotifications } from "../contexts/NotificationsContext";

export default function NotificationsPanel() {
  const { notifications, markRead } = useNotifications();

  if (!notifications || notifications.length === 0) {
    return (
      <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <p className="text-sm text-gray-600">No notifications</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
      <div className="px-3 py-2 border-b border-gray-100">
        <strong className="text-sm">Notifications</strong>
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
