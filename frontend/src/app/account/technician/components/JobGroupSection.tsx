"use client";

import React from "react";
import type { WorkerBookingRow } from "../../../../lib/api/workerBookings";
import type { GroupedAssigned } from "../types";
import { BookeePill, GroupCountPill } from "./BookeePill";
import {
  formatCreated,
  formatNotes,
  formatRange,
  formatRelativeToNow,
  pickDisplayName,
} from "../helpers";

export default function JobGroupSection({
  group,
  expanded,
  busyId,
  onToggle,
  onOpenDetail,
  onOpenComplete,
}: {
  group: GroupedAssigned<WorkerBookingRow>;
  expanded: boolean;
  busyId: string | null;
  onToggle: () => void;
  onOpenDetail: (publicId: string) => void;
  onOpenComplete: (publicId: string) => void;
}) {
  return (
    <section
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{group.title}</h3>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: "rgb(var(--muted))" }}>
            {group.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GroupCountPill count={group.rows.length} tone={group.tone === "danger" ? "danger" : "normal"} />
          {group.rows.length > 0 ? (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-xl border px-3 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
            >
              {expanded ? "Hide jobs" : "Show jobs"}
            </button>
          ) : null}
        </div>
      </div>

      {group.rows.length === 0 ? (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
        >
          <span style={{ color: "rgb(var(--muted))" }}>No jobs in this section.</span>
        </div>
      ) : !expanded ? (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
        >
          <span style={{ color: "rgb(var(--muted))" }}>
            {group.rows.length} {group.rows.length === 1 ? "job" : "jobs"} hidden.
          </span>
        </div>
      ) : (
        <div className="grid gap-3">
          {group.rows.map((b) => {
            const busy = busyId === b.public_id;
            const notes = formatNotes(b.notes);
            const bookee = pickDisplayName(b);

            return (
              <div
                key={b.public_id}
                className="rounded-2xl border p-3 sm:p-4"
                style={{
                  borderColor: group.tone === "danger" ? "rgb(239 68 68 / 0.35)" : "rgb(var(--border))",
                  background: group.tone === "danger" ? "rgb(127 29 29 / 0.12)" : "rgba(var(--bg), 0.10)",
                }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 truncate text-sm font-semibold sm:text-base">{b.service_title}</div>
                        <BookeePill kind={bookee.kind} />
                        <span
                          className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
                          style={{
                            borderColor: group.tone === "danger" ? "rgb(239 68 68 / 0.45)" : "rgb(var(--border))",
                            background: group.tone === "danger" ? "rgb(127 29 29 / 0.18)" : "rgba(var(--bg), 0.18)",
                          }}
                        >
                          Assigned
                        </span>
                      </div>

                      <div className="mt-2 text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
                        {formatRange(b.starts_at, b.ends_at)}
                      </div>

                      <div
                        className="mt-1 text-xs font-semibold"
                        style={{ color: group.tone === "danger" ? "rgb(254 202 202)" : "rgb(var(--muted))" }}
                      >
                        {formatRelativeToNow(b.starts_at)}
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
                            <div className="mt-1 text-sm break-words">{b.address || bookee.customerAddress || "—"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="text-xs break-words" style={{ color: "rgb(var(--muted))" }}>
                          Booking ID: <span className="font-mono">{b.public_id}</span>
                        </div>
                        <div className="text-xs break-words sm:text-right" style={{ color: "rgb(var(--muted))" }}>
                          Created: {formatCreated(b.created_at)}
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
                      onClick={() => onOpenDetail(b.public_id)}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                      disabled={!!busyId}
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenComplete(b.public_id)}
                      disabled={busy}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    >
                      {busy ? "Working…" : "Complete Job"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}