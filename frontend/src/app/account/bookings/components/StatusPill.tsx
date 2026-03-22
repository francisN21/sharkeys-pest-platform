"use client";

import React from "react";
import type { BookingCard } from "../../../../lib/api/bookings";

const STATUS_META: Record<string, { label: string; bg: string; border: string; text: string }> = {
  pending: {
    label: "Pending",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.30)",
    text: "rgb(253 230 138)",
  },
  accepted: {
    label: "Accepted",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.30)",
    text: "rgb(186 230 253)",
  },
  assigned: {
    label: "Assigned",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.30)",
    text: "rgb(199 210 254)",
  },
  completed: {
    label: "Completed",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.30)",
    text: "rgb(167 243 208)",
  },
  cancelled: {
    label: "Cancelled",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.20)",
    text: "rgb(252 165 165)",
  },
};

export default function StatusPill({ status }: { status: BookingCard["status"] }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.12)",
    text: "rgb(var(--muted))",
  };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: meta.bg, borderColor: meta.border, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}
