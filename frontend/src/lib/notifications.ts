import { api } from "./api";

export type NotificationKind =
  | "scan_assigned"
  | "scan_reviewed"
  | "report_finalised"
  | "staff_joined";

export interface ServerNotification {
  id: string;
  type: NotificationKind;
  message: string;
  scan_id: string | null;
  created_at: string;
  read: boolean;
}

export interface NotificationPrefs {
  scan_assigned: boolean;
  scan_reviewed: boolean;
  report_finalised: boolean;
  staff_joined: boolean;
  in_app_sound: boolean;
}

export async function listNotifications(limit = 30): Promise<ServerNotification[]> {
  const { data } = await api.get<ServerNotification[]>("/notifications", {
    params: { limit },
  });
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const { data } = await api.get<NotificationPrefs>("/notifications/preferences");
  return data;
}

/** Only the fields you send change. */
export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const { data } = await api.put<NotificationPrefs>(
    "/notifications/preferences",
    patch,
  );
  return data;
}
