export type UserRole = "admin" | "clinician";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  full_name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface MessageResponse {
  detail: string;
}
