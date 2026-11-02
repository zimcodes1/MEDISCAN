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
