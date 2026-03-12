"use client";

import { useMemo, useState } from "react";
import {
  reassignBooking,
  type TechBookingRow,
  type TechRow,
} from "../../lib/api/adminTechBookings";

/** ---------- Helpers ---------- */

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

/** ---------- Lead/Registered helpers ---------- */

type PersonKind = "lead" | "registered";

type TechBookingWithLead = TechBookingRow & {
  crm_tag?: string | null;
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

function getBookee(b: TechBookingWithLead) {
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

function formatAccountTypeLabel(v: string | null | undefined) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "—";
  if (s === "residential") return "Residential";
  if (s === "business") return "Business";
  return String(v);
}

/** ---------- Component ---------- */

export default function AssignTechCards({
  technicians,
  techOptions,
  onRefresh,
  onExpand,
}: {
  technicians: TechRow[];
  techOptions: TechRow[];
  onRefresh: () => Promise<void> | void;
  onExpand: (bookingPublicId: string) => void;
}) {
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignBookingId, setReassignBookingId] = useState<string | null>(null);
  const [fromTechId, setFromTechId] = useState<number | null>(null);

  const [targetTechId, setTargetTechId] = useState<string>("");
  const [reassignErr, setReassignErr] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);

  const [expandedTechs, setExpandedTechs] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const t of technicians) {
      const count = t.bookings?.length ?? 0;
      init[Number(t.user_id)] = count > 0 && count <= 2;
    }
    return init;
  });

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
      await onRefresh();
    } catch (e: unknown) {
      setReassignErr(e instanceof Error ? e.message : "Failed to reassign booking");
    } finally {
      setReassigning(false);
    }
  }

  const totalBookings = useMemo(() => {
    return technicians.reduce((acc, t) => acc + (t.bookings?.length ?? 0), 0);
  }, [technicians]);

  function toggleTech(userId: number) {
    setExpandedTechs((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Technician Bookings</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            View each technician’s assigned appointments and re-assign when needed.
          </p>
          <p className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
            Total assigned: {totalBookings}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRefresh()}
          className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          title="Refresh list"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {technicians.map((t) => {
          const list: TechBookingWithLead[] = (t.bookings ?? []) as TechBookingWithLead[];
          const techId = Number(t.user_id);
          const expanded = !!expandedTechs[techId];

          return (
            <section
              key={t.user_id}
              className="rounded-2xl border p-3 sm:p-4"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold sm:text-base">{techLabel(t)}</div>
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
                        <span className="font-medium">Phone:</span> {normalizeText(t.phone)}
                      </div>
                      <div className="text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
                        <span className="font-medium">Email:</span> {normalizeText(t.email ?? null)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTech(techId)}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold transition hover:opacity-90"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
                    aria-expanded={expanded}
                  >
                    {expanded ? "Hide bookings" : "Show bookings"}
                  </button>
                </div>

                {!expanded ? (
                  <div
                    className="rounded-xl border p-3 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
                  >
                    <span style={{ color: "rgb(var(--muted))" }}>
                      {list.length === 0
                        ? "No assigned bookings."
                        : `${list.length} assigned ${list.length === 1 ? "booking" : "bookings"} hidden.`}
                    </span>
                  </div>
                ) : list.length === 0 ? (
                  <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                    No assigned bookings.
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

                                <div className="mt-2 text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
                                  {b.address}
                                </div>

                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  <div
                                    className="rounded-xl border px-3 py-2.5"
                                    style={{
                                      borderColor: "rgb(var(--border))",
                                      background: "rgba(var(--bg), 0.18)",
                                    }}
                                  >
                                    <div
                                      className="text-[11px] font-semibold uppercase tracking-wide"
                                      style={{ color: "rgb(var(--muted))" }}
                                    >
                                      Customer
                                    </div>
                                    <div className="mt-1 break-words text-sm font-medium">{bookee.displayName}</div>
                                  </div>

                                  <div
                                    className="rounded-xl border px-3 py-2.5"
                                    style={{
                                      borderColor: "rgb(var(--border))",
                                      background: "rgba(var(--bg), 0.18)",
                                    }}
                                  >
                                    <div
                                      className="text-[11px] font-semibold uppercase tracking-wide"
                                      style={{ color: "rgb(var(--muted))" }}
                                    >
                                      Contact
                                    </div>
                                    <div className="mt-1 break-words text-sm">
                                      Phone: {bookee.phone ?? "—"}
                                      <br />
                                      Email: {bookee.email ?? "—"}
                                      {bookee.accountType ? (
                                        <>
                                          <br />
                                          {formatAccountTypeLabel(bookee.accountType)}
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 sm:items-end">
                                <button
                                  type="button"
                                  className="rounded-xl border px-3 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                                  onClick={() => openReassignModal(b.public_id, techId)}
                                  disabled={reassigning}
                                  title="Re-assign this booking"
                                >
                                  Re-assign
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onExpand(b.public_id)}
                                  className="rounded-xl border px-3 py-2 text-xs font-semibold hover:opacity-90"
                                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                                  title="Expand booking details"
                                >
                                  Expand
                                </button>
                              </div>
                            </div>

                            <div
                              className="rounded-xl border p-3 text-sm"
                              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.22)" }}
                            >
                              <div
                                className="text-[11px] font-semibold uppercase tracking-wide"
                                style={{ color: "rgb(var(--muted))" }}
                              >
                                Notes
                              </div>
                              <div className="mt-1 whitespace-pre-wrap break-words">{normalizeText(b.notes ?? null)}</div>
                            </div>

                            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                              Booking ID: <span className="font-mono">{b.public_id}</span>
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
              <div
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
              >
                {reassignErr}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
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

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
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