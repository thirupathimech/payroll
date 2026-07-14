/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/payroll";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, AUTH_VIEW_MODE_KEY } from "../api/client";
import type { UserSummary } from "../types";

export type ViewMode = "personnel" | "management";

interface AuthContextValue {
  user: UserSummary | null;
  token: string | null;
  loading: boolean;
  viewMode: ViewMode;
  canSwitchViewMode: boolean;
  setViewMode: (mode: ViewMode) => void;
  login: (orgCode: string, email: string, password: string) => Promise<void>;
  register: (payload: { companyName: string; fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(() => {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as UserSummary) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [loading, setLoading] = useState(Boolean(token));
  const [viewModeState, setViewModeState] = useState<ViewMode>(() =>
    localStorage.getItem(AUTH_VIEW_MODE_KEY) === "management" ? "management" : "personnel",
  );
  const canSwitchViewMode = Boolean(user && user.role !== "EMPLOYEE");
  const viewMode = canSwitchViewMode ? viewModeState : "personnel";

  useEffect(() => {
    let mounted = true;
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then((currentUser) => {
        if (!mounted) {
          return;
        }
        setUser(currentUser);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
        if (currentUser.role === "EMPLOYEE") {
          setViewModeState("personnel");
          localStorage.setItem(AUTH_VIEW_MODE_KEY, "personnel");
        }
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  async function login(orgCode: string, email: string, password: string) {
    const response = await authApi.login(orgCode, email, password);
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    localStorage.setItem(AUTH_VIEW_MODE_KEY, "personnel");
    setToken(response.token);
    setUser(response.user);
    setViewModeState("personnel");
  }

  async function register(payload: { companyName: string; fullName: string; email: string; password: string }) {
    const response = await authApi.register(payload);
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    localStorage.setItem(AUTH_VIEW_MODE_KEY, "personnel");
    setToken(response.token);
    setUser(response.user);
    setViewModeState("personnel");
  }

  function setViewMode(mode: ViewMode) {
    const nextMode = canSwitchViewMode ? mode : "personnel";
    setViewModeState(nextMode);
    localStorage.setItem(AUTH_VIEW_MODE_KEY, nextMode);
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_VIEW_MODE_KEY);
    setToken(null);
    setUser(null);
    setViewModeState("personnel");
  }

  const value = useMemo(
    () => ({ user, token, loading, viewMode, canSwitchViewMode, setViewMode, login, register, logout }),
    [user, token, loading, viewMode, canSwitchViewMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
