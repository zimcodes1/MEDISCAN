import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.MODE === "development"
    ? "http://127.0.0.1:7860"
    : "https://mediscan.fastapicloud.dev");

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export function setAuthTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
}

export function clearAuthTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function getAccessToken() {
  return localStorage.getItem("access_token");
}

export function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 from these means "bad credentials", not "expired session":
// surface the message to the form instead of refreshing/redirecting.
const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

function isAuthRequest(url?: string) {
  return !!url && AUTH_PATHS.some((p) => url.startsWith(p));
}

// One in-flight refresh shared by every request that hits a 401 at once.
let refreshPromise: Promise<string> | null = null;

async function refreshTokens(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token");
  // Plain axios (not `api`) so this call can't re-enter the interceptor below.
  const { data } = await axios.post<{
    access_token: string;
    refresh_token: string;
  }>(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
  setAuthTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

/** Turn a FastAPI `detail` (string, or a list of validation errors) into one readable line. */
function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const field = Array.isArray(d?.loc)
          ? d.loc.filter((p) => p !== "body").join(".")
          : "";
        const msg = d?.msg ?? JSON.stringify(d);
        return field ? `${field}: ${msg}` : msg;
      })
      .join("; ");
  }
  return detail !== undefined ? JSON.stringify(detail) : "Request failed";
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: unknown }>) => {
    const original = error.config as RetriableConfig | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthRequest(original.url)
    ) {
      original._retried = true;
      try {
        refreshPromise ??= refreshTokens().finally(() => {
          refreshPromise = null;
        });
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        clearAuthTokens();
        redirectToLogin();
      }
    }

    return Promise.reject(
      new Error(formatDetail(error.response?.data?.detail)),
    );
  },
);

export { API_BASE_URL };
