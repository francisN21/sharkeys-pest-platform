"use client";

import React, { useMemo } from "react";
import { useRealtime } from "../../lib/realtime/useRealtime";

type RealtimeProviderProps = {
  children: React.ReactNode;
  userId?: number | null;
  roles?: string[] | null;
};

export function RealtimeProvider({
  children,
  userId,
  roles,
}: RealtimeProviderProps) {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL ?? "";

  const wsUrl = useMemo(() => {
    if (!baseUrl) return "";
    if (!userId) return "";

    const parsedRoles = Array.isArray(roles) ? roles.filter(Boolean) : [];
    const sep = baseUrl.includes("?") ? "&" : "?";

    return `${baseUrl}${sep}userId=${encodeURIComponent(String(userId))}&roles=${encodeURIComponent(parsedRoles.join(","))}`;
  }, [baseUrl, userId, roles]);

  useRealtime(wsUrl);

  return <>{children}</>;
}