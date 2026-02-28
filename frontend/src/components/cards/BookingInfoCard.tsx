// frontend/src/components/cards/BookingInfoCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { TechBookingDetail } from "../../lib/api/adminTechBookings";
import type { WorkerBookingRow } from "../../lib/api/workerBookings";
import { me as apiMe } from "../../lib/api/auth";

function normalizeText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

type PersonKind = "lead" | "registered";
type QuoteStatus = "pending" | "approved" | "paid" | "balance_due";
type ViewerRole = "customer" | "worker" | "admin" | "superuser" | string;

/**
 * BookingInfoCard can now take:
 * - Admin detail: TechBookingDetail
 * - Worker list row: WorkerBookingRow
 * - Customer detail: arbitrary shape (record)
 */
type BookingLike = TechBookingDetail | WorkerBookingRow | Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function getString(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function getNullableString(obj: unknown, key: string): string | null | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : v === null ? null : undefined;
}

function hasKey(obj: unknown, key: string): boolean {
  return isRecord(obj) && key in obj;
}

function isWorkerRow(b: BookingLike): b is WorkerBookingRow {
  return (
    isRecord(b) &&
    typeof b.public_id === "string" &&
    typeof b.starts_at === "string" &&
    (hasKey(b, "customer_first_name") ||
      hasKey(b, "lead_first_name") ||
      hasKey(b, "address") ||
      hasKey(b, "notes"))
  );
}

function isAdminDetail(b: BookingLike): b is TechBookingDetail {
  return isRecord(b) && typeof b.public_id === "string" && (hasKey(b, "address_line1") || hasKey(b, "initial_notes"));
}

function normalizeViewerRole(role?: ViewerRole): "adminish" | "worker" | "customer" | "unknown" {
  const r = String(role ?? "").trim().toLowerCase();
  if (r === "admin" || r === "superuser") return "adminish";
  if (r === "worker") return "worker";
  if (r === "customer") return "customer";
  return "unknown";
}

/** ------------------ Me cache (prevents refetch spam) ------------------ */
type MeLite = { user_role?: string; roles?: string[] } | null;
let ME_CACHE: { status: "idle" | "loading" | "ready"; value: MeLite } = {
  status: "idle",
  value: null,
};

async function getMeCached(): Promise<MeLite> {
  if (ME_CACHE.status === "ready") return ME_CACHE.value;

  if (ME_CACHE.status === "loading") {
    while (ME_CACHE.status === "loading") {
      await new Promise((r) => setTimeout(r, 40));
    }
    return ME_CACHE.value;
  }

  ME_CACHE.status = "loading";
  try {
    const res = await apiMe();
    const user = res?.user ?? null;

    const rolesRaw =
      isRecord(user) && Array.isArray((user as Record<string, unknown>).roles)
        ? ((user as Record<string, unknown>).roles as unknown[]).filter((x): x is string => typeof x === "string")
        : undefined;

    const userRole =
      isRecord(user) && typeof (user as Record<string, unknown>).user_role === "string"
        ? String((user as Record<string, unknown>).user_role)
        : undefined;

    ME_CACHE.value = { user_role: userRole, roles: rolesRaw };
  } catch {
    ME_CACHE.value = null;
  } finally {
    ME_CACHE.status = "ready";
  }

  return ME_CACHE.value;
}

/** ------------------ UI helpers ------------------ */

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
    pending: { label: "Pending", bg: "rgba(245, 158, 11, 0.16)", border: "rgba(245, 158, 11, 0.55)", title: "Quote sent, awaiting approval" },
    approved: { label: "Approved", bg: "rgba(34, 197, 94, 0.14)", border: "rgba(34, 197, 94, 0.55)", title: "Customer approved the quote" },
    paid: { label: "Paid", bg: "rgba(59, 130, 246, 0.14)", border: "rgba(59, 130, 246, 0.55)", title: "Invoice is fully paid" },
    balance_due: { label: "Balance Due", bg: "rgba(239, 68, 68, 0.14)", border: "rgba(239, 68, 68, 0.55)", title: "Balance remaining on invoice" },
  };

  const m = meta[status];

  return (
    <span className="rounded-full border px-2 py-1 text-xs font-semibold" style={{ borderColor: m.border, background: m.bg }} title={m.title}>
      {m.label}
    </span>
  );
}

function QuoteCard() {
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

/** ------------------ COMPONENT ------------------ */

export default function BookingInfoCard({ booking }: { booking: BookingLike }) {
  const [viewerRole, setViewerRole] = useState<ViewerRole>("unknown");

  useEffect(() => {
    let alive = true;

    (async () => {
      const me = await getMeCached();
      if (!alive) return;

      const ur = String(me?.user_role ?? "").trim().toLowerCase();
      if (ur) {
        setViewerRole(ur);
        return;
      }

      const roles = me?.roles ?? [];
      const lower = roles.map((r) => String(r ?? "").trim().toLowerCase()).filter(Boolean);

      if (lower.includes("superuser")) setViewerRole("superuser");
      else if (lower.includes("admin")) setViewerRole("admin");
      else if (lower.includes("worker")) setViewerRole("worker");
      else if (lower.includes("customer")) setViewerRole("customer");
      else setViewerRole("unknown");
    })();

    return () => {
      alive = false;
    };
  }, []);

  const viewer = normalizeViewerRole(viewerRole);

  // Visibility rules
  const showCustomerSection = viewer === "adminish" || viewer === "worker" || viewer === "unknown";
  const showTechSection = viewer === "adminish" || viewer === "customer" || viewer === "unknown";

  // Shared basics
  const publicId = getString(booking, "public_id") ?? "—";
  const serviceTitle = getString(booking, "service_title") ?? "—";
  const startsAt = getNullableString(booking, "starts_at") ?? null;
  const endsAt = getNullableString(booking, "ends_at") ?? null;
  const status = getString(booking, "status") ?? "—";

  const kind: PersonKind = (() => {
    if (isAdminDetail(booking)) return booking.lead_public_id ? "lead" : "registered";
    if (isWorkerRow(booking)) return booking.lead_public_id ? "lead" : "registered";
    const lp = getString(booking, "lead_public_id");
    return lp ? "lead" : "registered";
  })();

  // Address
  const addressText = (() => {
    if (isAdminDetail(booking)) {
      const parts = [
        booking.address_line1,
        booking.address_line2,
        [booking.city, booking.state, booking.zip].filter(Boolean).join(" "),
      ]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean);
      return parts.join(", ") || "—";
    }

    if (isWorkerRow(booking)) {
      const a = String(booking.address ?? "").trim();
      return a || "—";
    }

    const line1 = getString(booking, "address_line1");
    const line2 = getString(booking, "address_line2");
    const city = getString(booking, "city");
    const state = getString(booking, "state");
    const zip = getString(booking, "zip");

    const parts = [line1, line2, [city, state, zip].filter(Boolean).join(" ")]
      .map((x) => String(x ?? "").trim())
      .filter(Boolean);

    if (parts.length) return parts.join(", ");

    const fallback = getString(booking, "address");
    return String(fallback ?? "").trim() || "—";
  })();

  // Notes
  const notesText = (() => {
    if (isAdminDetail(booking)) return normalizeText(booking.initial_notes);
    if (isWorkerRow(booking)) return normalizeText(booking.notes ?? null);

    const initial = getNullableString(booking, "initial_notes");
    const notes = getNullableString(booking, "notes");
    return normalizeText((initial ?? notes) ?? null);
  })();

  const crmTag = getNullableString(booking, "crm_tag") ?? null;

  // Customer display
  const displayName = (() => {
    if (isAdminDetail(booking)) {
      const leadName = `${(booking.lead_first_name ?? "").trim()} ${(booking.lead_last_name ?? "").trim()}`.trim();
      const name = String(booking.customer_name ?? "").trim() || leadName;
      const email = booking.customer_email ?? booking.lead_email ?? null;
      return name || email || "—";
    }

    if (isWorkerRow(booking)) {
      const leadName = `${(booking.lead_first_name ?? "").trim()} ${(booking.lead_last_name ?? "").trim()}`.trim();
      const custName = `${(booking.customer_first_name ?? "").trim()} ${(booking.customer_last_name ?? "").trim()}`.trim();

      const name = (booking.lead_public_id ? leadName : custName) || custName || leadName;
      const email =
        (booking.lead_public_id ? booking.lead_email : booking.customer_email) ??
        booking.customer_email ??
        booking.lead_email ??
        null;

      return (name || email || "—").trim();
    }

    const customerName = getString(booking, "customer_name");
    if (customerName && customerName.trim()) return customerName.trim();

    const cf = getString(booking, "customer_first_name");
    const cl = getString(booking, "customer_last_name");
    const full = [cf, cl].filter(Boolean).join(" ").trim();
    if (full) return full;

    const email = getString(booking, "customer_email") ?? getString(booking, "lead_email") ?? getString(booking, "email");
    return String(email ?? "—").trim() || "—";
  })();

  const customerEmail = (() => {
    if (isAdminDetail(booking)) return booking.customer_email ?? booking.lead_email ?? null;
    if (isWorkerRow(booking)) {
      return (booking.lead_public_id ? booking.lead_email : booking.customer_email) ?? booking.customer_email ?? booking.lead_email ?? null;
    }
    return getNullableString(booking, "customer_email") ?? getNullableString(booking, "lead_email") ?? getNullableString(booking, "email") ?? null;
  })();

  const customerPhone = (() => {
    if (isAdminDetail(booking)) return booking.customer_phone ?? booking.lead_phone ?? null;
    if (isWorkerRow(booking)) {
      return (booking.lead_public_id ? booking.lead_phone : booking.customer_phone) ?? booking.customer_phone ?? booking.lead_phone ?? null;
    }
    return getNullableString(booking, "customer_phone") ?? getNullableString(booking, "lead_phone") ?? getNullableString(booking, "phone") ?? null;
  })();

  const accountType = (() => {
    if (isAdminDetail(booking)) return booking.customer_account_type ?? booking.lead_account_type ?? null;
    if (isWorkerRow(booking)) {
      return (booking.lead_public_id ? booking.lead_account_type : booking.customer_account_type) ?? booking.customer_account_type ?? booking.lead_account_type ?? null;
    }
    return (
      getNullableString(booking, "customer_account_type") ??
      getNullableString(booking, "lead_account_type") ??
      getNullableString(booking, "account_type") ??
      null
    );
  })();

  // Tech display
  const techName = (() => {
    if (isAdminDetail(booking)) {
      const fn = String(booking.worker_first_name ?? "").trim();
      const ln = String(booking.worker_last_name ?? "").trim();
      const full = [fn, ln].filter(Boolean).join(" ").trim();
      if (full) return full;
      if (booking.worker_email) return booking.worker_email;
      return "—";
    }

    if (isWorkerRow(booking)) return "You";

    const wf = getString(booking, "worker_first_name");
    const wl = getString(booking, "worker_last_name");
    const full = [wf, wl].filter(Boolean).join(" ").trim();
    if (full) return full;

    const email = getString(booking, "worker_email");
    return email?.trim() || "—";
  })();

  const techEmail = (() => {
    if (isAdminDetail(booking)) return booking.worker_email ?? null;
    if (isWorkerRow(booking)) return null;
    return getNullableString(booking, "worker_email") ?? null;
  })();

  const techPhone = (() => {
    if (isAdminDetail(booking)) return booking.worker_phone ?? null;
    if (isWorkerRow(booking)) return null;
    return getNullableString(booking, "worker_phone") ?? null;
  })();

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
      >
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

            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
            >
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
        {showCustomerSection ? (
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
        ) : (
          <div className="hidden md:block" />
        )}

        {showTechSection ? (
          <SectionCard title="Assigned Technician">
            <div className="space-y-2">
              <div className="text-sm font-semibold truncate">{normalizeText(techName)}</div>

              <div className="grid gap-3 pt-1">
                <CopyField label="Phone" value={techPhone} />
                <CopyField label="Email" value={techEmail} />
              </div>

              {isWorkerRow(booking) ? (
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  (Technician view — showing your assignment)
                </div>
              ) : null}
            </div>
          </SectionCard>
        ) : (
          <div className="hidden md:block" />
        )}
      </div>
    </div>
  );
}