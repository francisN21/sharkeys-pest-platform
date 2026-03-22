"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
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
  group: GroupedAssigned;
  expanded: boolean;
  busyId: string | null;
  onToggle: () => void;
  onOpenDetail: (publicId: string) => void;
  onOpenComplete: (publicId: string) => void;
}) {
  const isDanger = group.tone === "danger";

  return (
    <section
      className="overflow-hidden rounded-2xl border bg-white/[0.02]"
      style={{
        borderColor: isDanger ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.08)",
      }}
    >
      {/* Section header */}
      <div
        className="border-b px-4 py-4 sm:px-5"
        style={{
          borderColor: isDanger ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.07)",
          background: isDanger ? "rgba(127,29,29,0.10)" : "rgba(255,255,255,0.03)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-sm font-semibold sm:text-base"
              style={{ color: isDanger ? "rgb(254 202 202)" : "rgb(var(--fg))" }}
            >
              {group.title}
            </h3>
            <p className="mt-0.5 text-xs text-[rgb(var(--muted))] sm:text-sm">{group.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <GroupCountPill count={group.rows.length} tone={isDanger ? "danger" : "normal"} />

            {group.rows.length > 0 && (
              <button
                type="button"
                onClick={onToggle}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgb(var(--muted))] transition hover:bg-white/[0.06] hover:text-[rgb(var(--fg))]"
                aria-label={expanded ? "Collapse section" : "Expand section"}
                aria-expanded={expanded}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        {group.rows.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
            No jobs in this section.
          </div>
        ) : !expanded ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
            {group.rows.length} {group.rows.length === 1 ? "job" : "jobs"} hidden — expand to view.
          </div>
        ) : (
          <div className="grid gap-3">
            {group.rows.map((b: WorkerBookingRow) => {
              const busy = busyId === b.public_id;
              const notes = formatNotes(b.notes);
              const bookee = pickDisplayName(b);

              return (
                <div
                  key={b.public_id}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: isDanger ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)",
                    background: isDanger ? "rgba(127,29,29,0.08)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex flex-col gap-3">
                    {/* Service title + pills */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 truncate text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                          {b.service_title}
                        </div>
                        <BookeePill kind={bookee.kind} />
                        <span
                          className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                          style={{
                            borderColor: isDanger ? "rgba(239,68,68,0.35)" : "rgba(99,102,241,0.30)",
                            background: isDanger ? "rgba(127,29,29,0.18)" : "rgba(99,102,241,0.12)",
                            color: isDanger ? "rgb(254 202 202)" : "rgb(199 210 254)",
                          }}
                        >
                          Assigned
                        </span>
                      </div>

                      <div className="mt-1.5 text-sm text-[rgb(var(--muted))]">
                        {formatRange(b.starts_at, b.ends_at)}
                      </div>

                      <div
                        className="mt-0.5 text-xs font-semibold"
                        style={{ color: isDanger ? "rgb(254 202 202)" : "rgb(var(--muted))" }}
                      >
                        {formatRelativeToNow(b.starts_at)}
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
                            {b.address || bookee.customerAddress || "—"}
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
                        <span className="font-mono text-[rgb(var(--fg))]">{b.public_id}</span>
                      </div>
                      <div className="text-xs text-[rgb(var(--muted))] sm:text-right">
                        Created: {formatCreated(b.created_at)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(b.public_id)}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-60"
                        disabled={!!busyId}
                      >
                        Details
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenComplete(b.public_id)}
                        disabled={busy}
                        className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.09] disabled:opacity-60"
                      >
                        {busy ? "Working…" : "Complete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
