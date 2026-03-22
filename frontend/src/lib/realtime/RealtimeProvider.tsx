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
}: RealtimeProviderProps) {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL ?? "";

  // Identity is validated server-side via the session cookie at connection time.
  // No credentials are passed in the URL.
  const wsUrl = useMemo(() => {
    if (!baseUrl) return "";
    if (!userId) return "";
    return baseUrl;
  }, [baseUrl, userId]);

  useRealtime(wsUrl);

  return <>{children}</>;
}