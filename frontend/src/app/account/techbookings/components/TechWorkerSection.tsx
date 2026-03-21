"use client";

import React from "react";
import type { TechBookingRow, TechRow } from "../../../../lib/api/adminTechBookings";
import {
  formatAccountTypeLabel,
  formatRange,
  getBookee,
  getKind,
  normalizeText,
  techLabel,
} from "../helpers";

type TechBookingWithLead = TechBookingRow & {
  crm_tag?: string | null;
  lead_public_id?: string | null;
  lead_first_name?: string | null;
  lead_last_name?: string | null;
  lead_email?: string | null;
  lead_phone?: string | null;
  lead_account_type?: string | null;
};

function KindPill({ kind }: { kind: "lead" | "registered" }) {
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

function TagPill({ tag }: { tag: string | null | undefined }) {
  const t = (tag ?? "").trim();
  if (!t) return null;

  const key = t.toLowerCase();
  const bg =
    key === "vip"
      ? "rgba(34, 197, 94, 0.16)"
      : key === "hot"
        ? "rgba(239, 68, 68, 0.16)"
        : key === "warm"
          ? "rgba(245, 158, 11, 0.16)"
          : key === "cold"
            ? "rgba(59, 130, 246, 0.14)"
            : "rgba(59, 130, 246, 0.14)";

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
      style={{ borderColor: "rgb(var(--border))", background: bg }}
      title={`CRM Tag: ${t}`}
    >
      {t}
    </span>
  );
}

export default function TechWorkerSection({
  technician,
  expanded,
  onToggle,
  onOpenDetail,
  onReassign,
}: {
  technician: TechRow;
  expanded: boolean;
  onToggle: () => void;
  onOpenDetail: (bookingPublicId: string) => void;
  onReassign: (bookingPublicId: string) => void;
}) {
  const list: TechBookingWithLead[] = (technician.bookings ?? []) as TechBookingWithLead[];

  return (
    <section
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-sm font-semibold sm:text-base">{techLabel(technician)}</div>
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(var(--bg), 0.18)",
                  color: "rgb(var(--muted))",
                }}
              >
                {list.length} assigned
              </span>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
                <span className="font-medium">Phone:</span> {normalizeText(technician.phone)}
              </div>
              <div className="text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
                <span className="font-medium">Email:</span> {normalizeText(technician.email ?? null)}
              </div>
            </div>
          </div>

          {list.length > 0 ? (
            <button
              type="button"
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 hover:opacity-90"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgba(var(--bg), 0.18)",
              }}
              aria-label={expanded ? "Collapse technician bookings" : "Expand technician bookings"}
            >
              <span
                className={`text-lg font-bold leading-none transition-transform duration-200 ${
                  expanded ? "rotate-0" : "rotate-180"
                }`}
              >
                {expanded ? "−" : "+"}
              </span>
            </button>
          ) : null}
        </div>

        {list.length === 0 ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
          >
            <span style={{ color: "rgb(var(--muted))" }}>No assigned bookings.</span>
          </div>
        ) : !expanded ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
          >
            <span style={{ color: "rgb(var(--muted))" }}>
              {list.length} {list.length === 1 ? "booking" : "bookings"} hidden
            </span>
          </div>
        ) : (
          <div className="grid gap-3">
            {list.map((b) => {
              const kind = getKind(b);
              const bookee = getBookee(b);

              return (
                <div
                  key={b.public_id}
                  className="rounded-2xl border p-3 sm:p-4"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.08)" }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="min-w-0 truncate text-sm font-semibold sm:text-base">
                            {b.service_title}
                          </div>
                          <KindPill kind={kind} />
                          <TagPill tag={b.crm_tag} />
                        </div>

                        <div className="mt-2 text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
                          {formatRange(b.starts_at, b.ends_at)}
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div
                            className="rounded-xl border px-3 py-2.5"
                            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
                          >
                            <div
                              className="text-[11px] font-semibold uppercase tracking-wide"
                              style={{ color: "rgb(var(--muted))" }}
                            >
                              Customer
                            </div>
                            <div className="mt-1 text-sm font-medium break-words">
                              {bookee.displayName}
                              <span className="ml-2 text-xs font-normal" style={{ color: "rgb(var(--muted))" }}>
                                ({formatAccountTypeLabel(bookee.accountType)})
                              </span>
                            </div>
                          </div>

                          <div
                            className="rounded-xl border px-3 py-2.5"
                            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
                          >
                            <div
                              className="text-[11px] font-semibold uppercase tracking-wide"
                              style={{ color: "rgb(var(--muted))" }}
                            >
                              Contact
                            </div>
                            <div className="mt-1 text-sm break-words">
                              Phone: {bookee.phone ?? "—"}
                              <br />
                              Email: {bookee.email ?? "—"}
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <div
                              className="rounded-xl border px-3 py-2.5"
                              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
                            >
                              <div
                                className="text-[11px] font-semibold uppercase tracking-wide"
                                style={{ color: "rgb(var(--muted))" }}
                              >
                                Location
                              </div>
                              <div className="mt-1 text-sm break-words">{b.address || "—"}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="text-xs break-words" style={{ color: "rgb(var(--muted))" }}>
                            Booking ID: <span className="font-mono">{b.public_id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => onReassign(b.public_id)}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
                      >
                        Re-assign
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDetail(b.public_id)}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                      >
                        Details
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