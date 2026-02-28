// frontend/src/components/cards/BookingInfoCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { TechBookingDetail } from "../../lib/api/adminTechBookings";
import type { WorkerBookingRow } from "../../lib/api/workerBookings";

function normalizeText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

type PersonKind = "lead" | "registered";
type QuoteStatus = "pending" | "approved" | "paid" | "balance_due";

/**
 * Accept either:
 * - admin detail shape (TechBookingDetail)
 * - worker list row shape (WorkerBookingRow)
 */
type BookingLike = TechBookingDetail | WorkerBookingRow;

function isTechBookingDetail(b: BookingLike): b is TechBookingDetail {
  // admin detail has address_line1/city/zip and initial_notes
  return "address_line1" in b || "initial_notes" in b;
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

function QuoteStatusPill({ status }: { status: QuoteStatus }) {
  const meta: Record<QuoteStatus, { label: string; bg: string; border: string; title: string }> = {
    pending: {
      label: "Pending",
      bg: "rgba(245, 158, 11, 0.16)",
      border: "rgba(245, 158, 11, 0.55)",
      title: "Quote sent, awaiting approval",
    },
    approved: {
      label: "Approved",
      bg: "rgba(34, 197, 94, 0.14)",
      border: "rgba(34, 197, 94, 0.55)",
      title: "Customer approved the quote",
    },
    paid: {
      label: "Paid",
      bg: "rgba(59, 130, 246, 0.14)",
      border: "rgba(59, 130, 246, 0.55)",
      title: "Invoice is fully paid",
    },
    balance_due: {
      label: "Balance Due",
      bg: "rgba(239, 68, 68, 0.14)",
      border: "rgba(239, 68, 68, 0.55)",
      title: "Balance remaining on invoice",
    },
  };

  const m = meta[status];

  return (
    <span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: m.border, background: m.bg }} title={m.title}>
      {m.label}
    </span>
  );
}

function QuoteCard() {
  // TEMP: hardcoded quote values
  const status: QuoteStatus = "approved";
  const subtotal = 149;
  const tax = 0;
  const discount = 0;

  const total = subtotal + tax - discount;

  const paidAmount = status === "paid" ? total : 0;
  const balanceDue = Math.max(0, total - paidAmount);

  const showPaid = status === "paid" || paidAmount > 0;
  const showBalance = status === "balance_due" || balanceDue > 0;

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Quote</div>
        <div className="flex items-center gap-2">
          <QuoteStatusPill status={status} />
          <span
            className="rounded-full border px-2 py-1 text-xs font-semibold"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
            title="Temporary - hardcoded"
          >
            Temp
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <MoneyRow label="Service" value={`$${subtotal.toFixed(2)}`} />
        <MoneyRow label="Tax" value={`$${tax.toFixed(2)}`} />
        <MoneyRow label="Discount" value={`-$${discount.toFixed(2)}`} />
      </div>

      <div className="pt-2 border-t space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Total</div>
          <div className="text-lg font-bold">${total.toFixed(2)}</div>
        </div>

        {showPaid ? <MoneyRow label="Paid" value={`$${paidAmount.toFixed(2)}`} /> : null}
        {showBalance ? (
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Balance Due</div>
            <div className="text-sm font-bold">${balanceDue.toFixed(2)}</div>
          </div>
        ) : null}

        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Later this will come from booking totals / invoice.
        </div>
      </div>

      <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}>
        <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
          Notes
        </div>
        <div className="mt-1">“Customer approved quote on-site.”</div>
      </div>
    </div>
  );
}

export default function BookingInfoCard({ booking }: { booking: BookingLike }) {
  const kind: PersonKind = (booking as any).lead_public_id ? "lead" : "registered";

  // ✅ address normalization:
  // - admin detail: address_line1/address_line2/city/state/zip
  // - worker row: address (string)
  const addressText = useMemo(() => {
    if (!booking) return "—";

    if (isTechBookingDetail(booking)) {
      const parts = [
        booking.address_line1,
        booking.address_line2,
        [booking.city, booking.state, booking.zip].filter(Boolean).join(" "),
      ]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean);
      return parts.join(", ") || "—";
    }

    const maybeAddress = String((booking as WorkerBookingRow).address ?? "").trim();
    return maybeAddress || "—";
  }, [booking]);

  // ✅ notes normalization:
  // - admin detail: initial_notes
  // - worker row: notes
  const notesText = useMemo(() => {
    if (!booking) return "—";

    if (isTechBookingDetail(booking)) {
      return normalizeText(booking.initial_notes);
    }

    return normalizeText((booking as WorkerBookingRow).notes ?? null);
  }, [booking]);

  // ✅ display name normalization:
  // - admin detail: customer_name OR lead_first/last OR email
  // - worker row: customer_first/last OR lead_first/last OR email(s)
  const displayName = useMemo(() => {
    if (!booking) return "—";

    if (isTechBookingDetail(booking)) {
      const leadName = `${(booking.lead_first_name ?? "").trim()} ${(booking.lead_last_name ?? "").trim()}`.trim();
      const name = String(booking.customer_name ?? "").trim() || leadName;
      const email = booking.customer_email ?? booking.lead_email ?? null;
      return name || email || "—";
    }

    const b = booking as WorkerBookingRow;

    const leadName = `${(b.lead_first_name ?? "").trim()} ${(b.lead_last_name ?? "").trim()}`.trim();
    const custName = `${(b.customer_first_name ?? "").trim()} ${(b.customer_last_name ?? "").trim()}`.trim();

    const name = (b.lead_public_id ? leadName : custName) || custName || leadName;
    const email = (b.lead_public_id ? b.lead_email : b.customer_email) ?? b.customer_email ?? b.lead_email ?? null;

    return name || email || "—";
  }, [booking]);

  // ✅ customer contact normalization
  const customerEmail = useMemo(() => {
    if (!booking) return null;

    if (isTechBookingDetail(booking)) return booking.customer_email ?? booking.lead_email ?? null;

    const b = booking as WorkerBookingRow;
    return (b.lead_public_id ? b.lead_email : b.customer_email) ?? b.customer_email ?? b.lead_email ?? null;
  }, [booking]);

  const customerPhone = useMemo(() => {
    if (!booking) return null;

    if (isTechBookingDetail(booking)) return booking.customer_phone ?? booking.lead_phone ?? null;

    const b = booking as WorkerBookingRow;
    return (b.lead_public_id ? b.lead_phone : b.customer_phone) ?? b.customer_phone ?? b.lead_phone ?? null;
  }, [booking]);

  // ✅ account type normalization
  const accountType = useMemo(() => {
    if (!booking) return null;

    if (isTechBookingDetail(booking)) return booking.customer_account_type ?? booking.lead_account_type ?? null;

    const b = booking as WorkerBookingRow;
    return (b.lead_public_id ? b.lead_account_type : b.customer_account_type) ?? b.customer_account_type ?? b.lead_account_type ?? null;
  }, [booking]);

  // ✅ crm tag normalization (admin only, but safe)
  const crmTag = useMemo(() => {
    const t = (booking as any).crm_tag ?? null;
    return t;
  }, [booking]);

  // ✅ technician info normalization:
  // - admin detail: worker_first/last/email/phone
  // - worker row: may not include worker_* (you are the worker), so just show "You"
  const techName = useMemo(() => {
    if (!booking) return "—";

    if (isTechBookingDetail(booking)) {
      const fn = String(booking.worker_first_name ?? "").trim();
      const ln = String(booking.worker_last_name ?? "").trim();
      const full = [fn, ln].filter(Boolean).join(" ").trim();

      if (full) return full;
      if (booking.worker_email) return booking.worker_email;
      return "—";
    }

    // worker view (you are the assignee)
    return "You";
  }, [booking]);

  const techEmail = useMemo(() => {
    if (!booking) return null;
    if (isTechBookingDetail(booking)) return booking.worker_email ?? null;
    return null;
  }, [booking]);

  const techPhone = useMemo(() => {
    if (!booking) return null;
    if (isTechBookingDetail(booking)) return booking.worker_phone ?? null;
    return null;
  }, [booking]);

  // ✅ core fields shared by both types
  const serviceTitle = (booking as any).service_title ?? "—";
  const publicId = (booking as any).public_id ?? "—";
  const startsAt = (booking as any).starts_at ?? null;
  const endsAt = (booking as any).ends_at ?? null;
  const status = (booking as any).status ?? "—";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4" style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold truncate">{normalizeText(serviceTitle)}</div>
                <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                  {formatRange(startsAt, endsAt)}
                </div>
              </div>

              <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
                {status}
              </span>
            </div>

            <CopyField label="Service Address" value={addressText || null} />

            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}>
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                Notes
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">{notesText}</div>
            </div>

            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Booking ID: <span className="font-mono">{publicId}</span>
            </div>
          </div>

          <div className="lg:pl-2">
            <QuoteCard />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Customer">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{displayName}</div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Account type: {normalizeText(accountType)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <KindPill kind={kind} />
                <TagPill tag={crmTag} />
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

            <div className="grid gap-3 pt-1">
              <CopyField label="Phone" value={techPhone} />
              <CopyField label="Email" value={techEmail} />
            </div>

            {!isTechBookingDetail(booking) ? (
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                (Technician view — showing your assignment)
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}