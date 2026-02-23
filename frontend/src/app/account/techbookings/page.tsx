// frontend/src/app/account/techbookings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminTechBookings,
  reassignBooking,
  type TechRow,
  type TechBookingRow,
} from "../../../lib/api/adminTechBookings";

function techLabel(t: TechRow) {
  const name = `${(t.first_name ?? "").trim()} ${(t.last_name ?? "").trim()}`.trim();
  return name || t.email || `Tech #${t.user_id}`;
}

function normalizeText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;
  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

/** ---------- Lead/Registered helpers (for tech bookings rows) ---------- */

type PersonKind = "lead" | "registered";

// We’ll support both: (a) new lead fields, and (b) older “coalesced into customer_*” shape.
// This keeps the page working even if backend isn’t fully unified yet.
type TechBookingWithLead = TechBookingRow & {
  lead_public_id?: string | null;
  lead_first_name?: string | null;
  lead_last_name?: string | null;
  lead_email?: string | null;
  lead_phone?: string | null;
  lead_account_type?: string | null;
};

function getKind(b: TechBookingWithLead): PersonKind {
  return b.lead_public_id ? "lead" : "registered";
}

function KindPill({ kind }: { kind: PersonKind }) {
  const isLead = kind === "lead";
  return (
    <span
      className="rounded-full border px-2 py-1 text-xs font-semibold"
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

function getBookee(b: TechBookingWithLead) {
  // If backend already coalesced into “customer_*”, this still works.
  const leadName = `${(b.lead_first_name ?? "").trim()} ${(b.lead_last_name ?? "").trim()}`.trim();
  const customerName = String(b.customer_name ?? "").trim();

  const name = customerName || leadName || "";
  const email = b.customer_email ?? b.lead_email ?? null;
  const phone = b.customer_phone ?? b.lead_phone ?? null;
  const accountType = b.customer_account_type ?? b.lead_account_type ?? null;

  return {
    displayName: name.length ? name : email || "—",
    email,
    phone,
    accountType,
  };
}

export default function TechBookingsPage() {
  const [technicians, setTechnicians] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);

  async function refresh() {
    setPageErr(null);
    setLoading(true);
    try {
      const data = await getAdminTechBookings();
      setTechnicians(data.technicians ?? []);
    } catch (e: unknown) {
      setPageErr(e instanceof Error ? e.message : "Failed to load technician bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // --- Modal state ---
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignBookingId, setReassignBookingId] = useState<string | null>(null);
  const [fromTechId, setFromTechId] = useState<number | null>(null);

  // select value should be string
  const [targetTechId, setTargetTechId] = useState<string>("");
  const [reassignErr, setReassignErr] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);

  const techOptions = useMemo(() => technicians, [technicians]);

  function openReassignModal(bookingPublicId: string, currentTechId: number) {
    setReassignErr(null);
    setReassignBookingId(bookingPublicId);
    setFromTechId(currentTechId);
    setTargetTechId("");
    setReassignOpen(true);
  }

  function closeReassignModal() {
    if (reassigning) return;
    setReassignOpen(false);
    setReassignBookingId(null);
    setFromTechId(null);
    setTargetTechId("");
    setReassignErr(null);
  }

  async function onConfirmReassign() {
    setReassignErr(null);

    if (!reassignBookingId) return setReassignErr("Missing booking id.");
    if (!fromTechId) return setReassignErr("Missing current technician.");
    if (!targetTechId) return setReassignErr("Select a technician first.");

    const nextId = Number(targetTechId);
    if (!Number.isFinite(nextId) || nextId <= 0) return setReassignErr("Invalid technician selected.");
    if (nextId === fromTechId) return setReassignErr("Pick a different technician.");

    try {
      setReassigning(true);
      await reassignBooking(reassignBookingId, nextId);
      closeReassignModal();
      await refresh();
    } catch (e: unknown) {
      setReassignErr(e instanceof Error ? e.message : "Failed to reassign booking");
    } finally {
      setReassigning(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-sm" style={{ color: "rgb(var(--muted))" }}>
        Loading…
      </div>
    );
  }

  if (pageErr) {
    return (
      <div className="p-4 space-y-3">
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {pageErr}
        </div>
        <button
          type="button"
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          onClick={refresh}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Technician Bookings</h2>
        <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          View each technician’s assigned appointments and re-assign when needed.
        </p>
      </div>

      <div className="space-y-4">
        {technicians.map((t) => {
          const list: TechBookingWithLead[] = (t.bookings ?? []) as TechBookingWithLead[];

          return (
            <section
              key={t.user_id}
              className="rounded-2xl border p-4 space-y-3"
              style={{ borderColor: "rgb(var(--border))" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold truncate">{techLabel(t)}</div>
                  <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    {normalizeText(t.phone)} • {normalizeText(t.email ?? null)}
                  </div>
                </div>
                <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
                  {list.length} assigned
                </span>
              </div>

              {list.length === 0 ? (
                <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                  No assigned bookings.
                </div>
              ) : (
                <div className="grid gap-3">
                  {list.map((b) => {
                    const kind = getKind(b);
                    const bookee = getBookee(b);
                    console.log(getBookee)
                    return (
                      <div
                        key={b.public_id}
                        className="rounded-2xl border p-4 space-y-2"
                        style={{ borderColor: "rgb(var(--border))" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold truncate">{b.service_title}</div>
                              <KindPill kind={kind} />
                            </div>

                            <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                              {formatRange(b.starts_at, b.ends_at)}
                            </div>

                            <div className="mt-1 text-sm truncate" style={{ color: "rgb(var(--muted))" }}>
                              {b.address}
                            </div>

                            <div className="mt-2 text-sm">
                              <div className="font-semibold truncate">{bookee.displayName}</div>
                              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                                Phone: {bookee.phone ?? "—"} • Email: {bookee.email ?? "—"}
                                {bookee.accountType ? ` • ${bookee.accountType}` : ""}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="rounded-xl border px-3 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                            onClick={() => openReassignModal(b.public_id, Number(t.user_id))}
                            disabled={reassigning}
                            title="Re-assign this booking"
                          >
                            Re-assign
                          </button>
                        </div>

                        <div
                          className="rounded-xl border p-3 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        >
                          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                            Notes:
                          </div>
                          <div className="mt-1 whitespace-pre-wrap break-words">{normalizeText(b.notes ?? null)}</div>
                        </div>

                        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                          Booking ID: <span className="font-mono">{b.public_id}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {reassignOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeReassignModal} />

          <div
            className="relative w-full max-w-md rounded-2xl border p-5 space-y-4"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Re-assign booking</div>
                <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                  Choose a different technician for this appointment.
                </div>
              </div>

              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                onClick={closeReassignModal}
                disabled={reassigning}
              >
                Close
              </button>
            </div>

            {reassignErr ? (
              <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
                {reassignErr}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                Assign to
              </div>

              <select
                value={targetTechId}
                onChange={(e) => setTargetTechId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                disabled={reassigning}
              >
                <option value="">Select technician…</option>
                {techOptions.map((t) => (
                  <option key={t.user_id} value={String(t.user_id)}>
                    {techLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                onClick={closeReassignModal}
                disabled={reassigning}
              >
                Cancel
              </button>

              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                onClick={onConfirmReassign}
                disabled={reassigning || !targetTechId}
              >
                {reassigning ? "Re-assigning…" : "Confirm re-assign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}