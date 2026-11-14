// Request/response shapes for the FastAPI backend (see backend-api.md).

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** Body of 202 responses such as POST /auth/register. */
export interface MessageResponse {
  detail: string;
}

export type UserRole = "admin" | "clinician" | "radiologist";

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  job_title?: string | null;
  phone_number?: string | null;
  /** Relative API path, e.g. /users/{id}/avatar. Load it with useProtectedImage. */
  avatar_url?: string | null;
  is_platform_admin?: boolean;
}

export interface OrgRef {
  id: string;
  name: string;
}

/** GET /auth/me */
export interface CurrentUser extends UserPublic {
  organisation: OrgRef;
  /** True only for the admin who registered the organisation, until they finish the setup. */
  onboarding_pending?: boolean;
}
