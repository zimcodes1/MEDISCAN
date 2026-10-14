// Request/response shapes shared with the FastAPI backend.
// NOTE: inferred from how the frontend uses them. Compare against the
// pydantic schemas in build/space/backend and adjust field names/optionality.

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
  token_type?: string;
}

export interface MessageResponse {
  message: string;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  is_active?: boolean;
}
