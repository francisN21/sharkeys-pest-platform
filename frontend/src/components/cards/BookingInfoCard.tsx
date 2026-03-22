"use client";

import React, { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Briefcase,
  ClipboardList,
  Copy,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";
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
  return (
    isRecord(b) &&
    typeof b.public_id === "string" &&
    (hasKey(b, "address_line1") || hasKey(b, "initial_notes"))
  );
}

function normalizeViewerRole(
  role?: ViewerRole
): "admin" | "superuser" | "worker" | "customer" | "unknown" {
  const r = String(role ?? "").trim().toLowerCase();
  if (r === "admin") return "admin";
  if (r === "superuser") return "superuser";
  if (r === "worker") return "worker";
  if (r === "customer") return "customer";
  return "unknown";
}

/** ------------------ Me cache ------------------ */
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
        ? ((user as Record<string, unknown>).roles as unknown[]).filter(
            (x): x is string => typeof x === "string"
          )
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

/** ------------------ Price API helpers ------------------ */

type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error(
      "Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000)."
    );
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
    const msg =
      (data as ApiErrorShape)?.message ||
      (data as ApiErrorShape)?.error ||
      `Request failed (${res.status})`;
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

function InfoShell({
  title,
  icon,
  actions,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="border-b border-white/[0.07] bg-white/[0.03] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">{title}</h3>
            </div>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
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

const STATUS_PILL_META: Record<string, { bg: string; border: string; text: string }> = {
  pending:   { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.30)",  text: "rgb(253 230 138)" },
  accepted:  { bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.30)",  text: "rgb(186 230 253)" },
  assigned:  { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.30)",  text: "rgb(199 210 254)" },
  completed: { bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.30)",  text: "rgb(167 243 208)" },
  cancelled: { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.20)",   text: "rgb(252 165 165)" },
};

function StatusPill({ status }: { status: string }) {
  const s = String(status ?? "").trim().toLowerCase();
  const meta = STATUS_PILL_META[s] ?? {
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.12)",
    text: "rgb(var(--muted))",
  };
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: meta.bg, borderColor: meta.border, color: meta.text }}
    >
      {label}
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

function formatRange(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt || !endsAt) return "—";
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

function CopyIcon({ copied }: { copied: boolean }) {
  return copied ? <span className="text-sm font-bold">✓</span> : <Copy className="h-4 w-4" />;
}

function CopyField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
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
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
            {icon}
            <span>{label}</span>
          </div>
          <div className="mt-1 break-words text-sm text-[rgb(var(--fg))]">{normalizeText(value)}</div>
        </div>

        <button
          type="button"
          onClick={onCopy}
          disabled={disabled}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition hover:bg-white/[0.06] disabled:opacity-60"
          style={{
            borderColor: copied ? "rgba(34,197,94,0.40)" : "rgba(255,255,255,0.12)",
            background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
            color: copied ? "rgb(34 197 94)" : "rgb(var(--muted))",
          }}
          title={copied ? "Copied" : "Copy"}
        >
          <CopyIcon copied={copied} />
        </button>
      </div>
    </div>
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">{value}</div>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
      <div className="text-sm text-[rgb(var(--muted))]">{label}</div>
      <div className={emphasized ? "text-base font-bold text-[rgb(var(--fg))]" : "text-sm font-semibold text-[rgb(var(--fg))]"}>
        {value}
      </div>
    </div>
  );
}

/** ------------------ Price card ------------------ */

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
      const res = await jsonFetch<{ ok: boolean; price: BookingPrice }>(
        `/bookings/${encodeURIComponent(publicId)}/price`,
        {
          method: "GET",
        }
      );

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
      const res = await jsonFetch<{ ok: boolean; price: BookingPrice }>(
        `/bookings/${encodeURIComponent(publicId)}/price`,
        {
          method: "PATCH",
          body: JSON.stringify({ final_price_cents: cents }),
        }
      );

      setPrice(res.price);
      setEditAmount(
        centsToDollarInput(
          res.price.final_price_cents ??
            res.price.initial_price_cents ??
            serviceBasePriceCents
        )
      );
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
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="border-b border-white/[0.07] bg-white/[0.03] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">Pricing</div>
              <div className="text-xs text-[rgb(var(--muted))]">Initial service price and final on-site total</div>
            </div>
          </div>

          <span
            className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]"
            title="Currency"
          >
            {currency}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {err ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-4 text-sm text-[rgb(var(--muted))]">
            Loading price…
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <MoneyRow label="Initial price" value={centsToDollarsLabel(initialCents)} />
              <MoneyRow
                label="Final price"
                value={finalCents === null ? "—" : centsToDollarsLabel(finalCents)}
              />
              <MoneyRow label="Current total" value={totalDollars} emphasized />
            </div>

            {canEdit ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Set final price
                  </div>
                  <div className="mt-1 text-sm text-[rgb(var(--muted))]">
                    Update the completed on-site total for this booking.
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-44">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[rgb(var(--muted))]">
                      $
                    </span>

                    <input
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] py-2.5 pl-7 pr-3 text-sm text-[rgb(var(--fg))] outline-none transition focus:border-white/[0.20]"
                      inputMode="decimal"
                      placeholder="e.g. 129.99"
                      disabled={saving}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving || editAmount.trim() === ""}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold transition hover:bg-white/[0.06] disabled:opacity-60"
                    title="Save final price"
                  >
                    {saving ? "Saving…" : "Save price"}
                  </button>

                  <button
                    type="button"
                    onClick={load}
                    disabled={saving}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-60"
                    title="Refresh price"
                  >
                    Refresh
                  </button>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-[rgb(var(--muted))]">
                  Preview total:{" "}
                  <span className="font-semibold text-[rgb(var(--fg))]">
                    {previewCents === null ? "—" : centsToDollarsLabel(previewCents)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-xs text-[rgb(var(--muted))]">
                Customer view — pricing updates appear here after the technician sets the final price.
              </div>
            )}
          </>
        )}
      </div>
    </section>
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
      const lower = roles
        .map((r) => String(r ?? "").trim().toLowerCase())
        .filter(Boolean);

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

  const showCustomerSection =
    viewer === "admin" || viewer === "superuser" || viewer === "worker" || viewer === "unknown";
  const showTechSection =
    viewer === "admin" || viewer === "superuser" || viewer === "customer" || viewer === "unknown";

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

    const email =
      getString(booking, "customer_email") ??
      getString(booking, "lead_email") ??
      getString(booking, "email");

    return String(email ?? "—").trim() || "—";
  })();

  const customerEmail = (() => {
    if (isAdminDetail(booking)) return booking.customer_email ?? booking.lead_email ?? null;
    if (isWorkerRow(booking)) {
      return (booking.lead_public_id ? booking.lead_email : booking.customer_email) ??
        booking.customer_email ??
        booking.lead_email ??
        null;
    }
    return (
      getNullableString(booking, "customer_email") ??
      getNullableString(booking, "lead_email") ??
      getNullableString(booking, "email") ??
      null
    );
  })();

  const customerPhone = (() => {
    if (isAdminDetail(booking)) return booking.customer_phone ?? booking.lead_phone ?? null;
    if (isWorkerRow(booking)) {
      return (booking.lead_public_id ? booking.lead_phone : booking.customer_phone) ??
        booking.customer_phone ??
        booking.lead_phone ??
        null;
    }
    return (
      getNullableString(booking, "customer_phone") ??
      getNullableString(booking, "lead_phone") ??
      getNullableString(booking, "phone") ??
      null
    );
  })();

  const accountType = (() => {
    if (isAdminDetail(booking)) return booking.customer_account_type ?? booking.lead_account_type ?? null;
    if (isWorkerRow(booking)) {
      return (booking.lead_public_id
        ? booking.lead_account_type
        : booking.customer_account_type) ??
        booking.customer_account_type ??
        booking.lead_account_type ??
        null;
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

    const a =
      getNullableString(booking, "assigned_worker_email") ??
      getNullableString(booking, "assigned_to_email") ??
      null;
    if (a && String(a).trim()) return a;

    return getNullableString(booking, "worker_email") ?? null;
  })();

  const techPhone = (() => {
    if (isAdminDetail(booking)) return booking.worker_phone ?? null;
    if (viewer === "worker" && isWorkerRow(booking)) return null;

    const a =
      getNullableString(booking, "assigned_worker_phone") ??
      getNullableString(booking, "assigned_to_phone") ??
      null;
    if (a && String(a).trim()) return a;

    return getNullableString(booking, "worker_phone") ?? null;
  })();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-semibold text-[rgb(var(--fg))] sm:text-lg">
                    {normalizeText(serviceTitle)}
                  </div>
                  <KindPill kind={kind} />
                  <TagPill tag={crmTag} />
                </div>

                <div className="mt-1.5 text-sm text-[rgb(var(--muted))]">
                  {formatRange(startsAt, endsAt)}
                </div>
              </div>

              <StatusPill status={status} />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetaStat label="Status" value={status} />
              <MetaStat label="Type" value={kind === "lead" ? "Lead" : "Registered"} />
              <MetaStat label="Account" value={normalizeText(accountType)} />
              <MetaStat label="Booking" value={publicId === "—" ? "—" : publicId.slice(-8)} />
            </div>

            <CopyField icon={<MapPin className="h-3 w-3" />} label="Service address" value={addressText || null} />

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                <NotebookPen className="h-3 w-3" />
                <span>Notes</span>
              </div>
              <div className="mt-1.5 whitespace-pre-wrap break-words text-sm text-[rgb(var(--fg))]">
                {notesText}
              </div>
            </div>

            <div className="text-xs text-[rgb(var(--muted))]">
              Booking ID: <span className="font-mono text-[rgb(var(--fg))]">{publicId}</span>
            </div>
          </div>

          <div className="lg:pl-2">
            <PriceCard
              publicId={publicId}
              viewer={viewer}
              serviceBasePriceCents={serviceBasePriceCents}
            />
          </div>
        </div>
      </section>

      <div className={`grid gap-4 ${showCustomerSection && showTechSection ? "md:grid-cols-2" : ""}`}>
        {showCustomerSection ? (
          <InfoShell
            title="Customer"
            icon={<User className="h-5 w-5" />}
            actions={
              <div className="flex items-center gap-2">
                <KindPill kind={kind} />
                <TagPill tag={crmTag} />
              </div>
            }
          >
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">{displayName}</div>
                <div className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Account type: {normalizeText(accountType)}
                </div>
              </div>

              <div className="grid gap-3">
                <CopyField icon={<Phone className="h-3 w-3" />} label="Phone" value={customerPhone} />
                <CopyField icon={<Mail className="h-3 w-3" />} label="Email" value={customerEmail} />
              </div>
            </div>
          </InfoShell>
        ) : null}

        {showTechSection ? (
          <InfoShell title="Assigned Technician" icon={<Wrench className="h-5 w-5" />}>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  {normalizeText(techName) === "—" ? "Pending assignment" : normalizeText(techName)}
                </div>
              </div>

              <div className="grid gap-3">
                <CopyField icon={<Phone className="h-3 w-3" />} label="Phone" value={techPhone} />
                <CopyField icon={<Mail className="h-3 w-3" />} label="Email" value={techEmail} />
              </div>
            </div>
          </InfoShell>
        ) : null}
      </div>
    </div>
  );
}