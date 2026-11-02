import { api, clearAuthTokens, getRefreshToken, setAuthTokens } from "./api";
import type { AuthTokens, LoginRequest, MessageResponse, RefreshRequest, UserPublic } from "../types/api";

export async function registerUser(payload: LoginRequest): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/register", payload);
  return data;
}

export async function loginUser(payload: LoginRequest): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>("/auth/login", payload);
  setAuthTokens(data.access_token, data.refresh_token);
  return data;
}

export async function getCurrentUser(): Promise<UserPublic> {
  const { data } = await api.get<UserPublic>("/auth/me");
  return data;
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
