"use client";

import React from "react";
import type { BookeeKind } from "../types";

export function BookeePill({ kind }: { kind: BookeeKind }) {
  const isLead = kind === "lead";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
      style={{
        borderColor: "rgb(var(--border))",
        background: isLead ? "rgba(245, 158, 11, 0.18)" : "rgba(var(--bg), 0.20)",
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
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
      style={{
        borderColor: tone === "danger" ? "rgb(239 68 68 / 0.55)" : "rgb(var(--border))",
        background: tone === "danger" ? "rgb(127 29 29 / 0.18)" : "rgba(var(--bg), 0.18)",
        color: tone === "danger" ? "rgb(254 202 202)" : "rgb(var(--muted))",
      }}
    >
      {count} {count === 1 ? "job" : "jobs"}
    </span>
  );
}