import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type NotificationItem = {
  id: string;
  message: string;
  read?: boolean;
  time?: string;
};

const NotificationsContext = createContext<{
  notifications: NotificationItem[];
  add: (n: NotificationItem) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
}>({
  notifications: [],
  add: () => {},
  markRead: () => {},
  markAllRead: () => {},
  unreadCount: 0,
});

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const add = useCallback((n: NotificationItem) => {
    setNotifications((prev) => [n, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((p) => (p.id === id ? { ...p, read: true } : p)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((p) => ({ ...p, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({ notifications, add, markRead, markAllRead, unreadCount }),
    [notifications, add, markRead, markAllRead, unreadCount],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}

export default NotificationsContext;
