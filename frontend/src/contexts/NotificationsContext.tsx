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
}>({ notifications: [], add: () => {}, markRead: () => {} });

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

  const value = useMemo(
    () => ({ notifications, add, markRead }),
    [notifications, add, markRead],
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
