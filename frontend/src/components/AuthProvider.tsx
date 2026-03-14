"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { me as apiMe, logout as apiLogout, type MeResponse } from "../lib/api/auth";

export type AuthUser = NonNullable<MeResponse["user"]>;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  hydrated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_CHANGED_EVENT = "auth:changed";
const AUTH_BROADCAST_CHANNEL = "auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

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
        setHydrated(true);
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
    setLoading(false);
    setHydrated(true);

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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onAuthChanged() {
      void refresh();
    }

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [refresh]);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;

    try {
      bc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev?.data?.type === AUTH_CHANGED_EVENT) {
          void refresh();
        }
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
    () => ({
      user,
      loading,
      hydrated,
      refresh,
      logout,
    }),
    [user, loading, hydrated, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

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