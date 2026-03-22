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
import type { TechBookingRow, TechRow } from "../../lib/api/adminTechBookings";
import {
  formatAccountTypeLabel,
  formatRange,
  getBookee,
  getKind,
  normalizeText,
  techLabel,
} from "../../app/account/techbookings/helpers";
import type { PersonKind } from "../../app/account/techbookings/types";

// ─── Extended booking type (includes lead fields) ─────────────────────────────

type TechBookingWithLead = TechBookingRow & {
  crm_tag?: string | null;
  lead_public_id?: string | null;
  lead_first_name?: string | null;
  lead_last_name?: string | null;
  lead_email?: string | null;
  lead_phone?: string | null;
  lead_account_type?: string | null;
};

// ─── Pill components ──────────────────────────────────────────────────────────

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
      ? { bg: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.30)", text: "rgb(187 247 208)" }
      : key === "hot" || key === "bad"
      ? { bg: "rgba(239,68,68,0.16)", border: "rgba(239,68,68,0.30)", text: "rgb(254 202 202)" }
      : key === "warm" || key === "regular"
      ? { bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.30)", text: "rgb(253 230 138)" }
      : key === "cold" || key === "good"
      ? { bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.30)", text: "rgb(191 219 254)" }
      : { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", text: "rgb(var(--muted))" };

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

// ─── Shared small components ──────────────────────────────────────────────────

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
      <div className="mt-1 break-words text-sm text-[rgb(var(--fg))]">{children}</div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  technicians: TechRow[];
  onRefresh: () => Promise<void> | void;
  onExpand: (bookingPublicId: string) => void;
  onReassign: (bookingPublicId: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssignTechCards({ technicians, onRefresh, onExpand, onReassign }: Props) {
  const [expandedTechs, setExpandedTechs] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const t of technicians) {
      const count = t.bookings?.length ?? 0;
      init[Number(t.user_id)] = count > 0 && count <= 2;
    }
    return init;
  });

  const totalBookings = useMemo(
    () => technicians.reduce((acc, t) => acc + (t.bookings?.length ?? 0), 0),
    [technicians]
  );

  const activeTechs = useMemo(
    () => technicians.filter((t) => (t.bookings?.length ?? 0) > 0).length,
    [technicians]
  );

  function toggleTech(userId: number) {
    setExpandedTechs((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="border-b border-white/[0.07] bg-white/[0.03] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                  Technician Assignments
                </h2>
                <p className="mt-0.5 text-xs text-[rgb(var(--muted))] sm:text-sm">
                  Expand any technician to view their assigned bookings and re-assign if needed.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onRefresh()}
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

      {/* Per-tech collapsible cards */}
      {technicians.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
          <div className="text-sm font-semibold text-[rgb(var(--fg))]">No technician bookings found</div>
          <div className="mt-1 text-sm text-[rgb(var(--muted))]">
            Assigned bookings will appear here once dispatch activity begins.
          </div>
        </div>
      ) : (
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
                {/* Tech header row */}
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
                        className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Booking list */}
                <div className="p-4">
                  {!expanded ? (
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
                      {list.length === 0
                        ? "No assigned bookings."
                        : `${list.length} assigned ${list.length === 1 ? "booking" : "bookings"} — expand to view.`}
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
                              {/* Service + pills + time */}
                              <div>
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
                              </div>

                              {/* Stats row */}
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <StatBox label="Type" value={formatAccountTypeLabel(bookee.accountType)} />
                                <StatBox label="Status" value={String(b.status ?? "Assigned")} />
                                <StatBox label="Customer" value={bookee.displayName} />
                                <StatBox label="Booking" value={b.public_id.slice(-8)} />
                              </div>

                              {/* Detail tiles */}
                              <div className="grid gap-2 sm:grid-cols-2">
                                <DetailTile icon={<User className="h-3 w-3" />} label="Customer">
                                  {bookee.displayName}
                                </DetailTile>

                                <DetailTile icon={<Briefcase className="h-3 w-3" />} label="Account type">
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

                              {/* Notes */}
                              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                                  Notes
                                </div>
                                <div className="mt-1.5 whitespace-pre-wrap break-words text-sm text-[rgb(var(--fg))]">
                                  {normalizeText(b.notes ?? null)}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button
                                  type="button"
                                  onClick={() => onReassign(b.public_id)}
                                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
                                >
                                  Re-assign
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onExpand(b.public_id)}
                                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.06]"
                                >
                                  Details
                                </button>
                              </div>

                              <div className="text-xs text-[rgb(var(--muted))]">
                                Booking ID:{" "}
                                <span className="font-mono text-[rgb(var(--fg))]">{b.public_id}</span>
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
      )}
    </div>
  );
}
