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
    <div
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 truncate text-sm font-semibold sm:text-base">{booking.service_title}</div>
              <BookeePill kind={bookee.kind} />
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
              >
                Completed
              </span>
            </div>

            <div className="mt-2 text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
              {formatRange(booking.starts_at, booking.ends_at)}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div
                className="rounded-xl border px-3 py-2.5"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                  Customer
                </div>
                <div className="mt-1 text-sm font-medium break-words">
                  {bookee.displayName}
                  <span className="ml-2 text-xs font-normal" style={{ color: "rgb(var(--muted))" }}>
                    ({bookee.accountType})
                  </span>
                </div>
              </div>

              <div
                className="rounded-xl border px-3 py-2.5"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                  Contact
                </div>
                <div className="mt-1 text-sm break-words">
                  Phone: {bookee.phone}
                  <br />
                  Email: {bookee.email}
                </div>
              </div>

              <div className="sm:col-span-2">
                <div
                  className="rounded-xl border px-3 py-2.5"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                    Location
                  </div>
                  <div className="mt-1 text-sm break-words">{booking.address || bookee.customerAddress || "—"}</div>
                </div>
              </div>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="text-xs break-words" style={{ color: "rgb(var(--muted))" }}>
                Booking ID: <span className="font-mono">{booking.public_id}</span>
              </div>
              <div className="text-xs break-words sm:text-right" style={{ color: "rgb(var(--muted))" }}>
                Created: {formatCreated(booking.created_at)}
              </div>
            </div>
          </div>
        </div>

        {notes ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.22)" }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
              Customer Notes
            </div>
            <div className="mt-1 whitespace-pre-wrap break-words">{notes}</div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenDetail(booking.public_id)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            disabled={!!busyId}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}