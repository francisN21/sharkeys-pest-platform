"use client";

import React from "react";
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  User,
  Wrench,
} from "lucide-react";
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

function normalizeTagKey(input?: string | null) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getTagMeta(tag?: string | null) {
  const key = normalizeTagKey(tag);

  if (key === "vip") {
    return {
      label: "VIP",
      bg: "rgba(34,197,94,0.16)",
      border: "rgba(34,197,94,0.35)",
      text: "rgb(187 247 208)",
    };
  }

  if (key === "good") {
    return {
      label: "Good",
      bg: "rgba(59,130,246,0.14)",
      border: "rgba(59,130,246,0.30)",
      text: "rgb(191 219 254)",
    };
  }

  if (key === "bad" || key === "hot") {
    return {
      label: key === "hot" ? "Hot" : "Bad",
      bg: "rgba(239,68,68,0.16)",
      border: "rgba(239,68,68,0.30)",
      text: "rgb(254 202 202)",
    };
  }

  if (key === "regular" || key === "warm") {
    return {
      label: key === "warm" ? "Warm" : "Regular",
      bg: "rgba(245,158,11,0.14)",
      border: "rgba(245,158,11,0.30)",
      text: "rgb(253 230 138)",
    };
  }

  if (key === "cold") {
    return {
      label: "Cold",
      bg: "rgba(59,130,246,0.14)",
      border: "rgba(59,130,246,0.30)",
      text: "rgb(191 219 254)",
    };
  }

  if (key === "big_spender") {
    return {
      label: "Big Spender",
      bg: "rgba(168,85,247,0.18)",
      border: "rgba(168,85,247,0.34)",
      text: "rgb(233 213 255)",
    };
  }

  return {
    label: tag || "Tag",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.12)",
    text: "rgb(var(--muted))",
  };
}

function KindPill({ kind }: { kind: "lead" | "registered" }) {
  const isLead = kind === "lead";

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{
        borderColor: isLead ? "rgba(245,158,11,0.40)" : "rgba(255,255,255,0.12)",
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

  const meta = getTagMeta(t);

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ borderColor: meta.border, background: meta.bg, color: meta.text }}
      title={`CRM Tag: ${meta.label}`}
    >
      {meta.label}
    </span>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
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
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
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
                    {techLabel(technician)}
                  </div>

                  <span className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]">
                    {list.length} assigned
                  </span>
                </div>

                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{normalizeText(technician.phone)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{normalizeText(technician.email ?? null)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {list.length > 0 ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgb(var(--muted))] transition hover:bg-white/[0.06] hover:text-[rgb(var(--fg))]"
              aria-label={expanded ? "Collapse technician bookings" : "Expand technician bookings"}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
            No assigned bookings.
          </div>
        ) : !expanded ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
            {list.length} {list.length === 1 ? "booking" : "bookings"} hidden — expand to view.
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

                      <div className="sm:col-span-2">
                        <DetailTile icon={<CheckCircle2 className="h-3 w-3" />} label="Booking ID">
                          <span className="font-mono text-[13px]">{b.public_id}</span>
                        </DetailTile>
                      </div>
                    </div>

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
                        onClick={() => onOpenDetail(b.public_id)}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.06]"
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