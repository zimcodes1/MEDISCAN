import React, { createContext, useContext, useState } from "react";

type NotificationItem = { id: string; message: string; read?: boolean; time?: string };

const NotificationsContext = createContext<{
  notifications: NotificationItem[];
  add: (n: NotificationItem) => void;
  markRead: (id: string) => void;
}>({ notifications: [], add: () => {}, markRead: () => {} });

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  function add(n: NotificationItem) {
    setNotifications((prev) => [n, ...prev]);
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
  }

  return (
    <NotificationsContext.Provider value={{ notifications, add, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}

export default NotificationsContext;
