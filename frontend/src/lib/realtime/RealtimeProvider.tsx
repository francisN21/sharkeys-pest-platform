"use client";

import React from "react";
import { useRealtime } from "../../lib/realtime/useRealtime";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "";

  // If WS URL isn't set, just render app normally.
//   if (!wsUrl) return <>{children}</>;

  useRealtime(wsUrl);

  return <>{children}</>;
}