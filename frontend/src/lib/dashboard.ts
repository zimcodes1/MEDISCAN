import { api } from "./api";

export interface DashboardStats {
  total_scans: number;
  pending_review: number;
  urgent: number;
  flagged: number;
  reviewed_today: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  actor: { id: string; full_name: string } | null;
  scan_id: string | null;
  created_at: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/dashboard/stats");
  return data;
}

export async function listActivity(limit = 10): Promise<ActivityItem[]> {
  const { data } = await api.get<ActivityItem[]>("/activity", {
    params: { limit },
  });
  return data;
}
