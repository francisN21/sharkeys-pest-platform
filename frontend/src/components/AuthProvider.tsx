"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { me as apiMe, logout as apiLogout } from "../lib/api/auth";

export type AuthUser = {
  id: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiMe();
      // backend returns { ok, user, session }
      setUser((data as any)?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    // even if the request fails, treat it as logged out
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
