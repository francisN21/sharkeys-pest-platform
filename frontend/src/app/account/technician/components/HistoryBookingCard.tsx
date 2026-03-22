"use client";

import React from "react";
import type { WorkerBookingRow } from "../../../../lib/api/workerBookings";
import { BookeePill } from "./BookeePill";
import {
  formatCreated,
  formatNotes,
  formatRange,
  pickDisplayName,
} from "../helpers";

export default function HistoryBookingCard({
  booking,
  busyId,
  onOpenDetail,
}: {
  booking: WorkerBookingRow;
  busyId: string | null;
  onOpenDetail: (publicId: string) => void;
}) {
  const notes = formatNotes(booking.notes);
  const bookee = pickDisplayName(booking);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 truncate text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
              {booking.service_title}
            </div>
            <BookeePill kind={bookee.kind} />
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              style={{
                borderColor: "rgba(52,211,153,0.30)",
                background: "rgba(52,211,153,0.12)",
                color: "rgb(167 243 208)",
              }}
            >
              Completed
            </span>
          </div>

          <div className="mt-1.5 text-sm text-[rgb(var(--muted))]">
            {formatRange(booking.starts_at, booking.ends_at)}
          </div>
        </div>

        {/* Info tiles */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Customer
            </div>
            <div className="mt-1 break-words text-sm font-medium text-[rgb(var(--fg))]">
              {bookee.displayName}
              <span className="ml-2 text-xs font-normal text-[rgb(var(--muted))]">
                ({bookee.accountType})
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Contact
            </div>
            <div className="mt-1 break-words text-sm text-[rgb(var(--fg))]">
              {bookee.phone}
              <br />
              {bookee.email}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                Location
              </div>
              <div className="mt-1 break-words text-sm text-[rgb(var(--fg))]">
                {booking.address || bookee.customerAddress || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Customer Notes
            </div>
            <div className="mt-1 whitespace-pre-wrap break-words text-[rgb(var(--fg))]">{notes}</div>
          </div>
        ) : null}

        {/* Meta */}
        <div className="grid gap-1 sm:grid-cols-2">
          <div className="text-xs text-[rgb(var(--muted))]">
            Booking ID:{" "}
            <span className="font-mono text-[rgb(var(--fg))]">{booking.public_id}</span>
          </div>
          <div className="text-xs text-[rgb(var(--muted))] sm:text-right">
            Created: {formatCreated(booking.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenDetail(booking.public_id)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-60"
            disabled={!!busyId}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}
