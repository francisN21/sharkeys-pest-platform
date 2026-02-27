"use client";

import React, { useMemo, useState } from "react";
import type { TechBookingDetail } from "../../lib/api/adminTechBookings";

function normalizeText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

type PersonKind = "lead" | "registered";

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
      className="rounded-full border px-2 py-1 text-xs font-semibold"
      style={{ borderColor: "rgb(var(--border))", background: bg }}
      title={`CRM Tag: ${t}`}
    >
      {t}
    </span>
  );
}

function formatRange(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt || !endsAt) return "—";
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;

  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold"
      style={{
        borderColor: copied ? "rgb(34 197 94)" : "rgb(var(--border))",
        background: copied ? "rgba(34,197,94,0.12)" : "rgba(var(--bg), 0.20)",
        color: copied ? "rgb(34 197 94)" : "rgb(var(--text))",
      }}
      aria-hidden
    >
      {copied ? "✓" : "⧉"}
    </span>
  );
}

function CopyField({ label, value }: { label: string; value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const text = String(value ?? "").trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1100);
    } catch {
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);

        setCopied(true);
        window.setTimeout(() => setCopied(false), 1100);
      } catch {
        // ignore
      }
    }
  }

  const disabled = !String(value ?? "").trim();

  return (
    <div
      className="rounded-xl flex items-center border p-3 justify-between gap-3"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
          {label}
        </div>
        <div className="text-sm truncate">{normalizeText(value)}</div>
      </div>

      <button
        type="button"
        onClick={onCopy}
        disabled={disabled}
        className="hover:opacity-90 disabled:opacity-60"
        title={copied ? "Copied" : "Copy"}
      >
        <CopyIcon copied={copied} />
      </button>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div style={{ color: "rgb(var(--muted))" }}>{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function QuoteCard() {
  // TEMP: hardcoded quote values
  const subtotal = 149;
  const tax = 0;
  const discount = 0;
  const total = subtotal + tax - discount;

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Quote</div>
        <span
          className="rounded-full border px-2 py-1 text-xs font-semibold"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
          title="Temporary - hardcoded"
        >
          Temp
        </span>
      </div>

      <div className="space-y-2">
        <MoneyRow label="Service" value="$149.00" />
        <MoneyRow label="Tax" value="$0.00" />
        <MoneyRow label="Discount" value="$0.00" />
      </div>

      <div className="pt-2 border-t" style={{ borderColor: "rgb(var(--border))" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Total</div>
          <div className="text-lg font-bold">${total.toFixed(2)}</div>
        </div>
        <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
          Later this will come from booking totals / invoice.
        </div>
      </div>

      <div
        className="rounded-xl border p-3 text-sm"
        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
      >
        <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
          Notes
        </div>
        <div className="mt-1">“Customer approved quote on-site.”</div>
      </div>
    </div>
  );
}

export default function BookingInfoCard({ booking }: { booking: TechBookingDetail }) {
  const kind: PersonKind = booking.lead_public_id ? "lead" : "registered";

  const addressText = useMemo(() => {
    const parts = [
      booking.address_line1,
      booking.address_line2,
      [booking.city, booking.state, booking.zip].filter(Boolean).join(" "),
    ]
      .map((x) => String(x ?? "").trim())
      .filter(Boolean);

    return parts.join(", ");
  }, [booking.address_line1, booking.address_line2, booking.city, booking.state, booking.zip]);

  const displayName = useMemo(() => {
    const leadName = `${(booking.lead_first_name ?? "").trim()} ${(booking.lead_last_name ?? "").trim()}`.trim();
    const name = String(booking.customer_name ?? "").trim() || leadName;
    const email = booking.customer_email ?? booking.lead_email ?? null;
    return name || email || "—";
  }, [
    booking.customer_name,
    booking.customer_email,
    booking.lead_first_name,
    booking.lead_last_name,
    booking.lead_email,
  ]);

  const customerEmail = booking.customer_email ?? booking.lead_email ?? null;
  const customerPhone = booking.customer_phone ?? booking.lead_phone ?? null;

  const techName = useMemo(() => {
    const fn = String(booking.worker_first_name ?? "").trim();
    const ln = String(booking.worker_last_name ?? "").trim();
    const full = [fn, ln].filter(Boolean).join(" ").trim();

    if (full) return full;
    if (booking.worker_email) return booking.worker_email;
    if (booking.worker_user_id) return `Tech #${booking.worker_user_id}`;
    return "—";
  }, [booking.worker_first_name, booking.worker_last_name, booking.worker_email, booking.worker_user_id]);

  const techEmail = booking.worker_email ?? null;
  const techPhone = booking.worker_phone ?? null;

  return (
    <div className="space-y-4">
      {/* Top summary area: left info + right quote */}
      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT */}
          <div className="min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold truncate">{normalizeText(booking.service_title)}</div>
                <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                  {formatRange(booking.starts_at, booking.ends_at)}
                </div>
              </div>

              <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
                {booking.status ?? "—"}
              </span>
            </div>

            <CopyField label="Service Address" value={addressText || null} />

            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
            >
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                Notes
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">{normalizeText(booking.initial_notes)}</div>
            </div>

            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Booking ID: <span className="font-mono">{booking.public_id}</span>
            </div>
          </div>

          {/* RIGHT (red area): Quote / Pricing */}
          <div className="lg:pl-2">
            <QuoteCard />
          </div>
        </div>
      </div>

      {/* 2-column info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Customer">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{displayName}</div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Account type: {normalizeText(booking.customer_account_type ?? booking.lead_account_type ?? null)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <KindPill kind={kind} />
                <TagPill tag={booking.crm_tag} />
              </div>
            </div>

            <div className="grid gap-3 pt-1">
              <CopyField label="Phone" value={customerPhone} />
              <CopyField label="Email" value={customerEmail} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Assigned Technician">
          <div className="space-y-2">
            <div className="text-sm font-semibold truncate">{normalizeText(techName)}</div>

            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>

            </div>

            <div className="grid gap-3 pt-1">
              <CopyField label="Phone" value={techPhone} />
              <CopyField label="Email" value={techEmail} />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}