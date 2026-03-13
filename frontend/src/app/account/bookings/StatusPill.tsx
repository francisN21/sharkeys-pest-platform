"use client";

import React from "react";
import type { BookingCard } from "../../../lib/api/bookings";

export default function StatusPill({ status }: { status: BookingCard["status"] }) {
  const label =
    status === "pending"
      ? "Pending"
      : status === "accepted"
        ? "Accepted"
        : status === "assigned"
          ? "Assigned"
          : status === "completed"
            ? "Completed"
            : "Cancelled";

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
    >
      {label}
    </span>
  );
}