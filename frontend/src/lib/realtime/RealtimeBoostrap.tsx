"use client";

import React, { useEffect, useMemo, useState } from "react";
import { me as apiMe } from "../../lib/api/auth";
import { RealtimeProvider } from "./RealtimeProvider";

type RealtimeBootstrapProps = {
  children: React.ReactNode;
};

type IdentityState = {
  userId: number | null;
  roles: string[];
};

function normalizeRoles(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((x) => String(x ?? "").trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof input === "string" && input.trim()) {
    return [input.trim().toLowerCase()];
  }

  return [];
}

/**
 * Tries multiple possible me() response shapes so you don't get blocked
 * by one exact API shape.
 */
function extractRealtimeIdentity(data: unknown): IdentityState {
  if (!data || typeof data !== "object") {
    return { userId: null, roles: [] };
  }

  const obj = data as Record<string, unknown>;
  const user = (obj.user && typeof obj.user === "object" ? obj.user : null) as
    | Record<string, unknown>
    | null;

  const topLevelId =
    typeof obj.id === "number"
      ? obj.id
      : typeof obj.id === "string" && /^\d+$/.test(obj.id)
        ? Number(obj.id)
        : null;

  const userId =
    typeof user?.id === "number"
      ? user.id
      : typeof user?.id === "string" && /^\d+$/.test(user.id)
        ? Number(user.id)
        : topLevelId;

  const roles = [
    ...normalizeRoles(obj.roles),
    ...normalizeRoles(user?.roles),
    ...normalizeRoles(user?.role),
  ];

  return {
    userId: Number.isInteger(userId) && Number(userId) > 0 ? Number(userId) : null,
    roles: Array.from(new Set(roles)),
  };
}

export function RealtimeBootstrap({ children }: RealtimeBootstrapProps) {
  const [identity, setIdentity] = useState<IdentityState>({
    userId: null,
    roles: [],
  });

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await apiMe();
        if (!alive) return;

        setIdentity(extractRealtimeIdentity(data));
      } catch {
        if (!alive) return;

        setIdentity({ userId: null, roles: [] });
      } finally {
        if (alive) setLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const provider = useMemo(() => {
    if (!loaded) {
      return <>{children}</>;
    }

    return (
      <RealtimeProvider userId={identity.userId} roles={identity.roles}>
        {children}
      </RealtimeProvider>
    );
  }, [children, identity.roles, identity.userId, loaded]);

  return provider;
}