import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { formatDateTime } from "../lib/format";
import {
  getNotificationPrefs,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationPrefs,
  type ServerNotification,
} from "../lib/notifications";

export type NotificationItem = {
  id: string;
  message: string;
  read?: boolean;
  time?: string;
  /** Opens this scan when the notification is clicked. */
  scanId?: string | null;
};

const POLL_MS = 45_000;

const NotificationsContext = createContext<{
  notifications: NotificationItem[];
  /** A local, this-session-only message (form results and the like). */
  add: (n: NotificationItem) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
  prefs: NotificationPrefs | null;
  setPrefs: (p: NotificationPrefs) => void;
}>({
  notifications: [],
  add: () => {},
  markRead: () => {},
  markAllRead: () => {},
  unreadCount: 0,
  prefs: null,
  setPrefs: () => {},
});

/** A short, quiet two-note chime. Browsers may refuse until the page has had a click. */
function chime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.14);
      osc.stop(ctx.currentTime + i * 0.14 + 0.22);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // no audio available: the badge is enough
  }
}

/**
 * Notifications from the server (assigned scans, reviews, finalised reports, new
 * staff) plus the short local messages pages add with `add`. Server ones are
 * refreshed every 45 seconds and whenever you come back to the tab.
 */
export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const [local, setLocal] = useState<NotificationItem[]>([]);
  const [server, setServer] = useState<ServerNotification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const seen = useRef<Set<string> | null>(null); // null until the first load
  const prefsRef = useRef<NotificationPrefs | null>(null);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    seen.current = null;

    const load = () => {
      listNotifications()
        .then((rows) => {
          if (!active) return;
          const known = seen.current;
          const fresh = rows.filter((r) => !r.read && !known?.has(r.id));
          seen.current = new Set(rows.map((r) => r.id));
          setServer(rows);
          // sound only for things that arrived while you were here, never on first load
          if (known && fresh.length > 0 && prefsRef.current?.in_app_sound) chime();
        })
        .catch(() => {
          // offline or the session ended: keep what we have, try again next time
        });
    };

    load();
    getNotificationPrefs()
      .then((p) => active && setPrefs(p))
      .catch(() => {});
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  const add = useCallback((n: NotificationItem) => {
    setLocal((prev) => [{ ...n, id: `local-${n.id}` }, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    if (id.startsWith("local-")) {
      setLocal((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
      return;
    }
    setServer((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
    markNotificationRead(id).catch(() => {}); // the next refresh corrects it if this failed
  }, []);

  const markAllRead = useCallback(() => {
    setLocal((prev) => prev.map((p) => ({ ...p, read: true })));
    setServer((prev) => prev.map((p) => ({ ...p, read: true })));
    markAllNotificationsRead().catch(() => {});
  }, []);

  // signed out: show nothing from the previous person
  const notifications = useMemo<NotificationItem[]>(() => {
    if (!userId) return [];
    const fromServer: NotificationItem[] = server.map((n) => ({
      id: n.id,
      message: n.message,
      read: n.read,
      time: formatDateTime(n.created_at),
      scanId: n.scan_id,
    }));
    return [...local, ...fromServer];
  }, [userId, local, server]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({ notifications, add, markRead, markAllRead, unreadCount, prefs, setPrefs }),
    [notifications, add, markRead, markAllRead, unreadCount, prefs],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  return useContext(NotificationsContext);
}

export default NotificationsContext;
