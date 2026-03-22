"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  User,
  Users,
  Wrench,
} from "lucide-react";
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
  const date = s.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{
        borderColor: isLead ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.12)",
        background: isLead ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.05)",
        color: isLead ? "rgb(253 230 138)" : "rgb(var(--muted))",
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

  const meta =
    key === "vip"
      ? {
          bg: "rgba(34,197,94,0.16)",
          border: "rgba(34,197,94,0.30)",
          text: "rgb(187 247 208)",
        }
      : key === "hot" || key === "bad"
      ? {
          bg: "rgba(239,68,68,0.16)",
          border: "rgba(239,68,68,0.30)",
          text: "rgb(254 202 202)",
        }
      : key === "warm" || key === "regular"
      ? {
          bg: "rgba(245,158,11,0.14)",
          border: "rgba(245,158,11,0.30)",
          text: "rgb(253 230 138)",
        }
      : key === "cold" || key === "good"
      ? {
          bg: "rgba(59,130,246,0.14)",
          border: "rgba(59,130,246,0.30)",
          text: "rgb(191 219 254)",
        }
      : {
          bg: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.12)",
          text: "rgb(var(--muted))",
        };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ borderColor: meta.border, background: meta.bg, color: meta.text }}
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

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-[rgb(var(--fg))]">{value}</div>
    </div>
  );
}

function DetailTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm break-words text-[rgb(var(--fg))]">{children}</div>
    </div>
  );
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
    if (!Number.isFinite(nextId) || nextId <= 0) {
      return setReassignErr("Invalid technician selected.");
    }
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

  const activeTechs = useMemo(() => {
    return technicians.filter((t) => (t.bookings?.length ?? 0) > 0).length;
  }, [technicians]);

  function toggleTech(userId: number) {
    setExpandedTechs((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="border-b border-white/[0.07] bg-white/[0.03] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
                <Users className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                  Technician Bookings
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-[rgb(var(--muted))]">
                  View each technician’s assigned appointments and re-assign when needed.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRefresh()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
              title="Refresh list"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Technicians" value={technicians.length} />
            <StatBox label="Active Techs" value={activeTechs} />
            <StatBox label="Assigned Jobs" value={totalBookings} />
            <StatBox label="View" value="Per Tech" />
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {technicians.map((t) => {
          const list: TechBookingWithLead[] = (t.bookings ?? []) as TechBookingWithLead[];
          const techId = Number(t.user_id);
          const expanded = !!expandedTechs[techId];

          return (
            <section
              key={t.user_id}
              className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
            >
              <div className="border-b border-white/[0.07] bg-white/[0.03] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
                        <Wrench className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                            {techLabel(t)}
                          </div>
                          <span className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]">
                            {list.length} assigned
                          </span>
                        </div>

                        <div className="mt-2 grid gap-1 sm:grid-cols-2">
                          <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{normalizeText(t.phone)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{normalizeText(t.email ?? null)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTech(techId)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgb(var(--muted))] transition hover:bg-white/[0.06] hover:text-[rgb(var(--fg))]"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse technician bookings" : "Expand technician bookings"}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-4">
                {!expanded ? (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
                    {list.length === 0
                      ? "No assigned bookings."
                      : `${list.length} assigned ${list.length === 1 ? "booking" : "bookings"} hidden — expand to view.`}
                  </div>
                ) : list.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
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
                          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                                    {b.service_title}
                                  </span>
                                  <KindPill kind={kind} />
                                  <TagPill tag={b.crm_tag} />
                                </div>

                                <div className="mt-1.5 text-sm text-[rgb(var(--muted))]">
                                  {formatRange(b.starts_at, b.ends_at)}
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  <StatBox label="Type" value={formatAccountTypeLabel(bookee.accountType)} />
                                  <StatBox label="Status" value={String(b.status ?? "Assigned")} />
                                  <StatBox label="Customer" value={bookee.displayName} />
                                  <StatBox label="Booking" value={b.public_id.slice(-8)} />
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              <DetailTile icon={<User className="h-3 w-3" />} label="Customer">
                                {bookee.displayName}
                              </DetailTile>

                              <DetailTile
                                icon={<Briefcase className="h-3 w-3" />}
                                label="Account type"
                              >
                                {formatAccountTypeLabel(bookee.accountType)}
                              </DetailTile>

                              <DetailTile icon={<Phone className="h-3 w-3" />} label="Phone">
                                {bookee.phone ?? "—"}
                              </DetailTile>

                              <DetailTile icon={<Mail className="h-3 w-3" />} label="Email">
                                {bookee.email ?? "—"}
                              </DetailTile>

                              <div className="sm:col-span-2">
                                <DetailTile icon={<MapPin className="h-3 w-3" />} label="Location">
                                  {b.address || "—"}
                                </DetailTile>
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                                Notes
                              </div>
                              <div className="mt-1.5 whitespace-pre-wrap break-words text-sm text-[rgb(var(--fg))]">
                                {normalizeText(b.notes ?? null)}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                              <button
                                type="button"
                                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-60"
                                onClick={() => openReassignModal(b.public_id, techId)}
                                disabled={reassigning}
                                title="Re-assign this booking"
                              >
                                Re-assign
                              </button>

                              <button
                                type="button"
                                onClick={() => onExpand(b.public_id)}
                                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.06]"
                                title="Expand booking details"
                              >
                                Details
                              </button>
                            </div>

                            <div className="text-xs text-[rgb(var(--muted))]">
                              Booking ID: <span className="font-mono text-[rgb(var(--fg))]">{b.public_id}</span>
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

          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.10] bg-[rgb(var(--card))]">
            <div className="border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-[rgb(var(--fg))]">Re-assign booking</div>
                  <div className="mt-1 text-sm text-[rgb(var(--muted))]">
                    Choose a different technician for this appointment.
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold transition hover:bg-white/[0.06] disabled:opacity-60"
                  onClick={closeReassignModal}
                  disabled={reassigning}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {reassignErr ? (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {reassignErr}
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  Assign to
                </div>

                <select
                  value={targetTechId}
                  onChange={(e) => setTargetTechId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none"
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
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-60"
                  onClick={closeReassignModal}
                  disabled={reassigning}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.06] disabled:opacity-60"
                  onClick={onConfirmReassign}
                  disabled={reassigning || !targetTechId}
                >
                  {reassigning ? "Re-assigning…" : "Confirm re-assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}