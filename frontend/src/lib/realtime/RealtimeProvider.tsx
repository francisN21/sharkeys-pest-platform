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

    const normalizedRoles = Array.isArray(roles)
      ? roles.map((r) => String(r ?? "").trim().toLowerCase()).filter(Boolean)
      : [];

    const sep = baseUrl.includes("?") ? "&" : "?";

    return `${baseUrl}${sep}userId=${encodeURIComponent(
      String(userId)
    )}&roles=${encodeURIComponent(normalizedRoles.join(","))}`;
  }, [baseUrl, roles, userId]);

  useRealtime(wsUrl);

  return <>{children}</>;
}