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

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "clinician";
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
}
