"use client";

import React from "react";
import type { BookeeKind } from "../types";

export function BookeePill({ kind }: { kind: BookeeKind }) {
  const isLead = kind === "lead";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{
        borderColor: isLead ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.12)",
        background: isLead ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.05)",
        color: isLead ? "rgb(253 230 138)" : "rgb(var(--muted))",
      }}
      title={isLead ? "Unregistered lead" : "Registered customer"}
    >
      {isLead ? "Lead" : "Registered"}
    </span>
  );
}

export function GroupCountPill({
  count,
  tone = "normal",
}: {
  count: number;
  tone?: "normal" | "danger";
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{
        borderColor: tone === "danger" ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.12)",
        background: tone === "danger" ? "rgba(127,29,29,0.18)" : "rgba(255,255,255,0.05)",
        color: tone === "danger" ? "rgb(254 202 202)" : "rgb(var(--muted))",
      }}
    >
      {count} {count === 1 ? "job" : "jobs"}
    </span>
  );
}
