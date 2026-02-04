"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { me as apiMe, logout as apiLogout } from "../lib/api/auth";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  email_verified_at: string | null;
  created_at: string;
};

type MeResponse = {
  ok: boolean;
  user?: AuthUser;
  session?: { expiresAt: string };
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
    setLoading(true);
    try {
      const data = (await apiMe()) as MeResponse;
      
      setUser(data.user ?? null);
      console.log(data)
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
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