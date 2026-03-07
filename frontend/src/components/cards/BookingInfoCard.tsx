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
type ViewerRole = "customer" | "worker" | "admin" | "superuser" | string;

/**
 * BookingInfoCard can take:
 * - Admin detail: TechBookingDetail
 * - Worker list row: WorkerBookingRow
 * - Customer detail/list: arbitrary record
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

function getNumber(obj: unknown, key: string): number | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function hasKey(obj: unknown, key: string): boolean {
  return isRecord(obj) && key in obj;
}

/**
 * ✅ IMPORTANT:
 * Customer bookings can have `address` and `notes`,
 * so don't use those to identify WorkerBookingRow.
 */
function isWorkerRow(b: BookingLike): b is WorkerBookingRow {
  return (
    isRecord(b) &&
    typeof b.public_id === "string" &&
    typeof b.starts_at === "string" &&
    (hasKey(b, "customer_first_name") ||
      hasKey(b, "customer_last_name") ||
      hasKey(b, "customer_email") ||
      hasKey(b, "customer_phone") ||
      hasKey(b, "lead_first_name") ||
      hasKey(b, "lead_last_name") ||
      hasKey(b, "lead_email") ||
      hasKey(b, "lead_phone"))
  );
}

function isAdminDetail(b: BookingLike): b is TechBookingDetail {
  return isRecord(b) && typeof b.public_id === "string" && (hasKey(b, "address_line1") || hasKey(b, "initial_notes"));
}

/**
 * ✅ Revert to prior semantics (no "adminish"):
 * This matches your previously working logic.
 */
function normalizeViewerRole(role?: ViewerRole): "admin" | "superuser" | "worker" | "customer" | "unknown" {
  const r = String(role ?? "").trim().toLowerCase();
  if (r === "admin") return "admin";
  if (r === "superuser") return "superuser";
  if (r === "worker") return "worker";
  if (r === "customer") return "customer";
  return "unknown";
}

/** ------------------ Me cache (prevents refetch spam) ------------------ */
type MeLite = { user_role?: string; roles?: string[] } | null;
const ME_CACHE: { status: "idle" | "loading" | "ready"; value: MeLite } = {
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

/** ------------------ Price API helpers (reuses env + fetch style) ------------------ */

type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);

  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!res.ok) {
    const msg = (data as ApiErrorShape)?.message || (data as ApiErrorShape)?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

type BookingPrice = {
  initial_price_cents: number;
  final_price_cents: number | null;
  currency: string;
  set_by_user_id: number | null;
  set_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function centsToDollarsLabel(cents?: number | null) {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toFixed(2)}`;
}

function centsToDollarInput(cents?: number | null) {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return (n / 100).toFixed(2);
}

function parseDollarInputToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 100);
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

/** ------------------ Price card (uses service_base_price_cents fallback) ------------------ */

function PriceCard({
  publicId,
  viewer,
  serviceBasePriceCents,
}: {
  publicId: string;
  viewer: "admin" | "superuser" | "worker" | "customer" | "unknown";
  serviceBasePriceCents: number;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [price, setPrice] = useState<BookingPrice | null>(null);

  const [editAmount, setEditAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const canEdit = viewer === "worker" || viewer === "admin" || viewer === "superuser";

  async function load() {
    if (!publicId || publicId === "—") return;

    setErr(null);
    setLoading(true);
    try {
      const res = await jsonFetch<{ ok: boolean; price: BookingPrice }>(`/bookings/${encodeURIComponent(publicId)}/price`, {
        method: "GET",
      });

      const p = res.price;
      setPrice(p);

      const bestForEdit =
        typeof p.final_price_cents === "number"
          ? p.final_price_cents
          : typeof p.initial_price_cents === "number" && p.initial_price_cents > 0
          ? p.initial_price_cents
          : serviceBasePriceCents;

      setEditAmount(centsToDollarInput(bestForEdit));
    } catch {
      setPrice(null);
      setEditAmount(centsToDollarInput(serviceBasePriceCents));
      setErr(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId, serviceBasePriceCents]);

  async function onSave() {
    if (!canEdit) return;
    if (!publicId || publicId === "—") return;

    const cents = parseDollarInputToCents(editAmount);
    if (cents === null) {
      setErr("Enter a valid dollar amount like 129.99.");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const res = await jsonFetch<{ ok: boolean; price: BookingPrice }>(`/bookings/${encodeURIComponent(publicId)}/price`, {
        method: "PATCH",
        body: JSON.stringify({ final_price_cents: cents }),
      });

      setPrice(res.price);
      setEditAmount(centsToDollarInput(res.price.final_price_cents ?? res.price.initial_price_cents ?? serviceBasePriceCents));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save price");
    } finally {
      setSaving(false);
    }
  }

  const currency = price?.currency ?? "USD";

  const initialCents =
    typeof price?.initial_price_cents === "number" && price.initial_price_cents > 0
      ? price.initial_price_cents
      : serviceBasePriceCents;

  const finalCents = price?.final_price_cents ?? null;
  const totalDollars = centsToDollarsLabel(finalCents ?? initialCents);

  const previewCents = parseDollarInputToCents(editAmount);

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Pricing</div>
        <span
          className="rounded-full border px-2 py-1 text-xs font-semibold"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
          title="Currency"
        >
          {currency}
        </span>
      </div>

      {err ? (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(239 68 68)", background: "rgba(239, 68, 68, 0.06)" }}
        >
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          Loading price…
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <MoneyRow label="Initial (from service)" value={centsToDollarsLabel(initialCents)} />
            <MoneyRow label="Final (set on-site)" value={finalCents === null ? "—" : centsToDollarsLabel(finalCents)} />
          </div>

          <div className="pt-2 border-t space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Current Total</div>
              <div className="text-lg font-bold">{totalDollars}</div>
            </div>

            {canEdit ? (
              <div className="mt-2 space-y-2">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  Set Final Price
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      $
                    </span>

                    <input
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-40 rounded-xl border py-2 pl-7 pr-3 text-sm"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                      inputMode="decimal"
                      placeholder="e.g. 129.99"
                      disabled={saving}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving || editAmount.trim() === ""}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                    title="Save final price"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={load}
                    disabled={saving}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    title="Refresh price"
                  >
                    Refresh
                  </button>
                </div>

                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Display: {previewCents === null ? "—" : centsToDollarsLabel(previewCents)}
                </div>
              </div>
            ) : (
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                (Customer view — pricing updates appear here after technician sets the final price.)
              </div>
            )}
          </div>
        </>
      )}
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

  const showCustomerSection = viewer === "admin" || viewer === "superuser" || viewer === "worker" || viewer === "unknown";
  const showTechSection = viewer === "admin" || viewer === "superuser" || viewer === "customer" || viewer === "unknown";

  const publicId = getString(booking, "public_id") ?? "—";
  const serviceTitle = getString(booking, "service_title") ?? "—";
  const startsAt = getNullableString(booking, "starts_at") ?? null;
  const endsAt = getNullableString(booking, "ends_at") ?? null;
  const status = getString(booking, "status") ?? "—";

  const serviceBasePriceCents =
    (() => {
      const n = getNumber(booking, "service_base_price_cents");
      return typeof n === "number" ? n : 0;
    })() ?? 0;

  const kind: PersonKind = (() => {
    if (isAdminDetail(booking)) return booking.lead_public_id ? "lead" : "registered";
    if (isWorkerRow(booking)) return booking.lead_public_id ? "lead" : "registered";
    const lp = getString(booking, "lead_public_id");
    return lp ? "lead" : "registered";
  })();

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

  const notesText = (() => {
    if (isAdminDetail(booking)) return normalizeText(booking.initial_notes);
    if (isWorkerRow(booking)) return normalizeText(booking.notes ?? null);

    const initial = getNullableString(booking, "initial_notes");
    const notes = getNullableString(booking, "notes");
    return normalizeText((initial ?? notes) ?? null);
  })();

  const crmTag = getNullableString(booking, "crm_tag") ?? null;

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

  const techName = (() => {
    if (isAdminDetail(booking)) {
      const fn = String(booking.worker_first_name ?? "").trim();
      const ln = String(booking.worker_last_name ?? "").trim();
      const full = [fn, ln].filter(Boolean).join(" ").trim();
      if (full) return full;
      if (booking.worker_email) return booking.worker_email;
      return "—";
    }

    if (viewer === "worker" && isWorkerRow(booking)) return "You";

    const af = getString(booking, "assigned_worker_first_name");
    const al = getString(booking, "assigned_worker_last_name");
    const assignedFull = [af, al].filter(Boolean).join(" ").trim();
    if (assignedFull) return assignedFull;

    const assignedToName = getString(booking, "assigned_to_name");
    if (assignedToName && assignedToName.trim()) return assignedToName.trim();

    const wf = getString(booking, "worker_first_name");
    const wl = getString(booking, "worker_last_name");
    const full = [wf, wl].filter(Boolean).join(" ").trim();
    if (full) return full;

    const email =
      getString(booking, "assigned_worker_email") ??
      getString(booking, "assigned_to_email") ??
      getString(booking, "worker_email");

    return email?.trim() || "—";
  })();

  const techEmail = (() => {
    if (isAdminDetail(booking)) return booking.worker_email ?? null;
    if (viewer === "worker" && isWorkerRow(booking)) return null;

    const a = getNullableString(booking, "assigned_worker_email") ?? getNullableString(booking, "assigned_to_email") ?? null;
    if (a && String(a).trim()) return a;

    return getNullableString(booking, "worker_email") ?? null;
  })();

  const techPhone = (() => {
    if (isAdminDetail(booking)) return booking.worker_phone ?? null;
    if (viewer === "worker" && isWorkerRow(booking)) return null;

    const a = getNullableString(booking, "assigned_worker_phone") ?? getNullableString(booking, "assigned_to_phone") ?? null;
    if (a && String(a).trim()) return a;

    return getNullableString(booking, "worker_phone") ?? null;
  })();

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
            <PriceCard publicId={publicId} viewer={viewer} serviceBasePriceCents={serviceBasePriceCents} />
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
              <div className="text-sm font-semibold truncate">
                {normalizeText(techName) === "—" ? "Pending assignment" : normalizeText(techName)}
              </div>

              <div className="grid gap-3 pt-1">
                <CopyField label="Phone" value={techPhone} />
                <CopyField label="Email" value={techEmail} />
              </div>

              {viewer === "worker" ? (
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