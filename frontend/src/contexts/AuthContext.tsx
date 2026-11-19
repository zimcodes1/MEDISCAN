import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, logoutUser } from "../lib/auth";
import { clearAuthTokens, getAccessToken } from "../lib/api";
import type { CurrentUser } from "../types/api";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  /** Reloads /auth/me and resolves with the fresh user (null when signed out). */
  refetch: () => Promise<CurrentUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refetch: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (): Promise<CurrentUser | null> => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const u = await getCurrentUser();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // token may already be invalid server-side; clear local state regardless
    }
    clearAuthTokens();
    setUser(null);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
