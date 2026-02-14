"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { me as apiMe, logout as apiLogout,type MeResponse } from "../lib/api/auth";

export type AuthUser = NonNullable<MeResponse["user"]>;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Global event name used to refresh auth state after login/signup
const AUTH_CHANGED_EVENT = "auth:changed";

// Cross-tab sync (optional but great UX)
const AUTH_BROADCAST_CHANNEL = "auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Prevent overlapping refreshes
  const refreshingRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return refreshingRef.current;

    const p = (async () => {
      setLoading(true);
      try {
        const data = await apiMe();
        setUser(data?.ok && data.user ? (data.user as AuthUser) : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
        refreshingRef.current = null;
      }
    })();

    refreshingRef.current = p;
    return p;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    setUser(null);

    // Tell other listeners/tabs to refresh too
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      try {
        const bc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
        bc.postMessage({ type: AUTH_CHANGED_EVENT });
        bc.close();
      } catch {
        // ignore
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for same-tab auth updates (login/signup triggers)
  useEffect(() => {
    function onAuthChanged() {
      refresh();
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [refresh]);

  // Listen for cross-tab auth updates
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev?.data?.type === AUTH_CHANGED_EVENT) refresh();
      };
    } catch {
      // ignore
    }
    return () => {
      try {
        bc?.close();
      } catch {
        // ignore
      }
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

/**
 * Helper to call after login/signup success:
 *   notifyAuthChanged();
 */
export function notifyAuthChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));

  try {
    const bc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    bc.postMessage({ type: AUTH_CHANGED_EVENT });
    bc.close();
  } catch {
    // ignore
  }
}