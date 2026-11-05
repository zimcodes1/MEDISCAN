import { api } from "./api";
import type { UserPublic } from "../types/api";

export type UserListFilter = "pending" | "all";

/** Admin only. `pending` = registrations waiting for approval. */
export async function listUsers(
  status: UserListFilter = "all",
): Promise<UserPublic[]> {
  const { data } = await api.get<UserPublic[]>("/admin/users", {
    params: { status },
  });
  return data;
}

// The response bodies aren't relied on; callers re-fetch the list afterwards.
export async function approveUser(userId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/approve`);
}

export async function deactivateUser(userId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/deactivate`);
}

export async function activateUser(userId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/activate`);
}

export interface PasswordResetLink {
  /** Shown once: only a hash is stored. */
  token: string;
  reset_url: string;
  expires_at: string;
  user: { id: string; full_name: string; email: string };
}

/**
 * Admin only. A one-time link for a colleague who lost their password. No email is
 * sent: the admin hands the link over. It replaces any earlier unused link.
 */
export async function createPasswordReset(
  userId: string,
): Promise<PasswordResetLink> {
  const { data } = await api.post<PasswordResetLink>(
    `/admin/users/${userId}/password-reset`,
  );
  return data;
}
