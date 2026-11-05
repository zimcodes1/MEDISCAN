import { api, clearAuthTokens, getRefreshToken, setAuthTokens } from "./api";
import type {
  AuthTokens,
  CurrentUser,
  LoginRequest,
  MessageResponse,
  RefreshRequest,
  UserPublic,
} from "../types/api";

export type OrganisationType =
  | "hospital"
  | "diagnostic_centre"
  | "clinic"
  | "telemedicine";

export interface OrganisationRegistration {
  organisation_name: string;
  organisation_type: OrganisationType;
  state: string;
  phone_number: string;
  full_name: string;
  email: string;
  password: string;
  radiologist_count?: number | null;
}

/** Creates a pending organisation and its first admin (202). A platform admin must approve it. */
export async function registerOrganisation(
  payload: OrganisationRegistration,
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>(
    "/auth/register-organisation",
    payload,
  );
  return data;
}

/** Turns an invitation link into an approved account (201). The caller then signs in. */
export async function acceptInvite(payload: {
  token: string;
  full_name: string;
  password: string;
}): Promise<UserPublic> {
  const { data } = await api.post<UserPublic>("/auth/accept-invite", payload);
  return data;
}

export async function loginUser(payload: LoginRequest): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>("/auth/login", payload);
  setAuthTokens(data.access_token, data.refresh_token);
  return data;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>("/auth/me");
  return data;
}

/** Sets a new password from an admin-issued link (204). Every session is ended; sign in again. */
export async function resetPassword(payload: {
  token: string;
  new_password: string;
}): Promise<void> {
  await api.post("/auth/reset-password", payload);
}

/** Only the fields you send change. */
export async function updateMe(patch: {
  full_name?: string;
  job_title?: string;
  phone_number?: string;
}): Promise<CurrentUser> {
  const { data } = await api.patch<CurrentUser>("/auth/me", patch);
  return data;
}

/** 204. The backend signs you out everywhere, this device included. */
export async function changePassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<void> {
  await api.post("/auth/me/password", payload);
}

export async function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<{ avatar_url: string }>("/auth/me/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteAvatar(): Promise<void> {
  await api.delete("/auth/me/avatar");
}

export async function refreshAccessToken(): Promise<AuthTokens> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens();
    throw new Error("Missing refresh token");
  }
  const payload: RefreshRequest = { refresh_token: refreshToken };
  const { data } = await api.post<AuthTokens>("/auth/refresh", payload);
  setAuthTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logoutUser(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await api.post("/auth/logout", { refresh_token: refreshToken } as RefreshRequest);
  }
  clearAuthTokens();
}
