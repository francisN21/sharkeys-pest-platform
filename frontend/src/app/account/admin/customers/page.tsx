"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Square,
  Tag,
  User,
  X,
} from "lucide-react";
import {
  adminListCustomers,
  adminGetCustomerDetail,
  adminSetCustomerTag,
  adminSendInvite,
  type AdminCustomerRow,
  type AdminCustomerDetailResponse,
  type AdminCustomerKind,
  type AdminCustomerBookingRow,
} from "../../../../lib/api/adminCustomers";
import UndoToast, { type UndoToastState } from "../_components/UndoToast";
import { usePolling } from "../_components/usePolling";

// ─── Constants ─────────────────────────────────────────────────────────────────

const BIG_SPENDER_THRESHOLD_CENTS = 100000; // $1,000.00

const TAG_OPTIONS = [
  { key: "regular", label: "Regular" },
  { key: "good", label: "Good" },
  { key: "bad", label: "Bad" },
  { key: "vip", label: "VIP" },
  { key: "big_spender", label: "Big Spender" },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCreated(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function formatMoneyFromCents(cents?: number | null) {
  const amount = (Number(cents) || 0) / 100;
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
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

function displayName(c: { first_name: string | null; last_name: string | null; email?: string | null }) {
  const fn = (c.first_name ?? "").trim();
  const ln = (c.last_name ?? "").trim();
  const name = [fn, ln].filter(Boolean).join(" ");
  return name || (c.email ?? "—") || "—";
}

function formatAccountTypeLabel(v?: string | null) {
  if (!v) return "—";
  const s = v.trim().toLowerCase();
  if (s === "residential") return "Residential";
  if (s === "business") return "Business";
  return v;
}

function normalizeTagKey(input?: string | null) {
  return String(input ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function getTagMeta(tag?: string | null) {
  const key = normalizeTagKey(tag);

  if (key === "vip")
    return { label: "VIP", bg: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.35)", text: "rgb(187 247 208)" };
  if (key === "good")
    return { label: "Good", bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.30)", text: "rgb(191 219 254)" };
  if (key === "bad")
    return { label: "Bad", bg: "rgba(239,68,68,0.16)", border: "rgba(239,68,68,0.30)", text: "rgb(254 202 202)" };
  if (key === "regular")
    return { label: "Regular", bg: "rgba(148,163,184,0.14)", border: "rgba(148,163,184,0.28)", text: "rgb(226 232 240)" };
  if (key === "big_spender")
    return { label: "Big Spender", bg: "rgba(168,85,247,0.18)", border: "rgba(168,85,247,0.34)", text: "rgb(233 213 255)" };

  return { label: tag || "Tag", bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.30)", text: "rgb(191 219 254)" };
}

function getDisplayTags(tag?: string | null, lifetimeValueCents?: number | null) {
  const pills: string[] = [];
  const normalized = normalizeTagKey(tag);
  if (normalized) pills.push(normalized);
  if ((Number(lifetimeValueCents) || 0) >= BIG_SPENDER_THRESHOLD_CENTS && normalized !== "big_spender")
    pills.push("big_spender");
  return pills;
}

// ─── Pills ─────────────────────────────────────────────────────────────────────

function KindPill({ kind }: { kind: AdminCustomerKind }) {
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

// ─── Tag Selector ──────────────────────────────────────────────────────────────

function TagSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        Tags
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2">
        <div className="flex min-h-12 flex-wrap items-center gap-2">
          {value ? (
            <button
              type="button"
              onClick={() => !disabled && onChange("")}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition hover:opacity-90 disabled:opacity-60"
              style={(() => {
                const meta = getTagMeta(value);
                return { borderColor: meta.border, background: meta.bg, color: meta.text };
              })()}
            >
              <span>{getTagMeta(value).label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ) : (
            <div className="text-sm text-[rgb(var(--muted))]">No tag selected</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.filter((item) => normalizeTagKey(item.key) !== normalizeTagKey(value)).map((item) => {
            const meta = getTagMeta(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChange(item.key)}
                disabled={disabled}
                className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-60"
                style={{ borderColor: meta.border, background: meta.bg, color: meta.text }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Stat box ──────────────────────────────────────────────────────────────────

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

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {label}
      </div>
      <div className={`mt-1 break-words text-sm ${mono ? "font-mono text-[13px]" : ""}`}>{value}</div>
    </div>
  );
}

// ─── Booking card (inside detail view) ─────────────────────────────────────────

function BookingCard({
  b,
  showPricePanel = false,
}: {
  b: AdminCustomerBookingRow & { effective_price_cents?: number | null };
  showPricePanel?: boolean;
}) {
  const hasNotes = Boolean(b.notes);
  const priceValue = formatMoneyFromCents(b.effective_price_cents);

  const statusColor: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.30)", text: "rgb(253 230 138)" },
    accepted: { bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.30)", text: "rgb(186 230 253)" },
    assigned: { bg: "rgba(99,102,241,0.14)", border: "rgba(99,102,241,0.30)", text: "rgb(199 210 254)" },
    completed: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.28)", text: "rgb(187 247 208)" },
    cancelled: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", text: "rgb(254 202 202)" },
  };
  const sc = statusColor[b.status] ?? statusColor.pending;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[rgb(var(--fg))]">{b.service_title}</span>
            <span
              className="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize"
              style={{ borderColor: sc.border, background: sc.bg, color: sc.text }}
            >
              {b.status}
            </span>
          </div>
          <div className="mt-1.5 text-sm text-[rgb(var(--muted))]">{formatRange(b.starts_at, b.ends_at)}</div>
          <div className="mt-1 text-sm text-[rgb(var(--muted))]">{b.address || "—"}</div>
        </div>
        {showPricePanel ? (
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Price</div>
            <div className="mt-0.5 text-base font-bold text-[rgb(var(--fg))]">{priceValue}</div>
          </div>
        ) : null}
      </div>

      {hasNotes ? (
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Notes</div>
          <div className="mt-1 whitespace-pre-wrap break-words">{b.notes}</div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgb(var(--muted))]">
        <span className="font-mono">{b.public_id}</span>
        <span>Created {formatCreated(b.created_at)}</span>
      </div>
    </div>
  );
}

function BookingGroupSection({
  title,
  subtitle,
  bookings,
  emptyText,
  initiallyExpanded = false,
  showCompletedPrice = false,
}: {
  title: string;
  subtitle?: string;
  bookings: Array<AdminCustomerBookingRow & { effective_price_cents?: number | null }>;
  emptyText: string;
  initiallyExpanded?: boolean;
  showCompletedPrice?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const count = bookings.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">{title}</h3>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[11px] font-bold text-[rgb(var(--muted))]">
              {count}
            </span>
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">{subtitle}</div>
          ) : null}
        </div>

        {count > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.06]"
            aria-expanded={expanded}
          >
            {expanded ? "Hide" : "Show"}
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
        ) : null}
      </div>

      {count === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
          {emptyText}
        </div>
      ) : expanded ? (
        <div className="grid gap-3">
          {bookings.map((b) => (
            <BookingCard key={b.public_id} b={b} showPricePanel={showCompletedPrice} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[rgb(var(--muted))]">
          {count} {count === 1 ? "booking" : "bookings"} — expand to view.
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminCustomerRow[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");

  const [view, setView] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<{ kind: AdminCustomerKind; public_id: string } | null>(null);
  const [detail, setDetail] = useState<AdminCustomerDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [tagValue, setTagValue] = useState<string>("");
  const [tagNote, setTagNote] = useState<string>("");
  const [tagBusy, setTagBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);

  // Undo for tag changes
  const [undoToast, setUndoToast] = useState<UndoToastState>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk tagging
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkTagValue, setBulkTagValue] = useState<string>("");
  const [bulkTagBusy, setBulkTagBusy] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const refresh = useCallback(async (opts?: { page?: number; q?: string }) => {
    const nextPage = opts?.page ?? page;
    const nextQ = opts?.q ?? qApplied;

    const res = await adminListCustomers({ page: nextPage, pageSize, q: nextQ || undefined });

    setRows(res.customers || []);
    setPage(res.page || nextPage);
    setTotal(res.total || 0);
    setTotalPages(res.totalPages || 1);
  }, [page, pageSize, qApplied]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setNotice(null);
        await refresh({ page: 1 });
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load customers");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh list every 60s
  usePolling(() => refresh(), 60_000, !loading && view === "list");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  async function openDetail(kind: AdminCustomerKind, publicId: string) {
    setErr(null);
    setNotice(null);
    setView("detail");
    setSelected({ kind, public_id: publicId });
    setDetail(null);
    setDetailLoading(true);

    try {
      const d = await adminGetCustomerDetail(kind, publicId);
      setDetail(d);
      setTagValue(d.tag?.tag ?? "");
      setTagNote(d.tag?.note ?? "");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load customer detail");
    } finally {
      setDetailLoading(false);
    }
  }

  function backToList() {
    setView("list");
    setSelected(null);
    setDetail(null);
    setTagValue("");
    setTagNote("");
    setNotice(null);
  }

  async function saveTag() {
    if (!selected) return;

    const prevTag = detail?.tag?.tag ?? null;
    const prevNote = detail?.tag?.note ?? null;

    try {
      setTagBusy(true);
      setErr(null);
      setNotice(null);

      await adminSetCustomerTag(
        selected.kind,
        selected.public_id,
        tagValue ? tagValue : null,
        tagNote ? tagNote : null
      );

      const d = await adminGetCustomerDetail(selected.kind, selected.public_id);
      setDetail(d);
      setTagValue(d.tag?.tag ?? "");
      setTagNote(d.tag?.note ?? "");
      await refresh();
      setNotice("Tag saved.");

      // Undo toast if a tag was cleared
      if (prevTag && !tagValue) {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

        setUndoToast({
          id: Date.now().toString(),
          message: `Tag "${getTagMeta(prevTag).label}" removed`,
          onUndo: async () => {
            try {
              setTagBusy(true);
              await adminSetCustomerTag(selected.kind, selected.public_id, prevTag, prevNote);
              const d2 = await adminGetCustomerDetail(selected.kind, selected.public_id);
              setDetail(d2);
              setTagValue(d2.tag?.tag ?? "");
              setTagNote(d2.tag?.note ?? "");
              await refresh();
              setNotice("Tag restored.");
            } catch {
              // ignore
            } finally {
              setTagBusy(false);
            }
          },
        });

        undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save tag");
    } finally {
      setTagBusy(false);
    }
  }

  async function sendInvite() {
    if (!selected || selected.kind !== "lead") return;

    try {
      setInviteBusy(true);
      setErr(null);
      setNotice(null);
      const res = await adminSendInvite(selected.kind, selected.public_id);
      setNotice(res.message || "Invite email sent.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setInviteBusy(false);
    }
  }

  // Bulk operations
  function toggleBulkSelect(key: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setBulkSelected(new Set(rows.map((c) => `${c.kind}:${c.public_id}`)));
  }

  function clearBulkSelect() {
    setBulkSelected(new Set());
    setBulkTagValue("");
  }

  async function bulkApplyTag() {
    if (bulkSelected.size === 0 || !bulkTagValue) return;

    const pairs = Array.from(bulkSelected).map((key) => {
      const [kind, ...rest] = key.split(":");
      return { kind: kind as AdminCustomerKind, publicId: rest.join(":") };
    });

    try {
      setBulkTagBusy(true);
      setErr(null);
      await Promise.all(pairs.map(({ kind, publicId }) => adminSetCustomerTag(kind, publicId, bulkTagValue)));
      await refresh();
      clearBulkSelect();
      setNotice(`Tag "${getTagMeta(bulkTagValue).label}" applied to ${pairs.length} customers.`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to bulk apply tag");
    } finally {
      setBulkTagBusy(false);
    }
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const sorted = useMemo(() => rows, [rows]);
  const allSelected = sorted.length > 0 && sorted.every((c) => bulkSelected.has(`${c.kind}:${c.public_id}`));

  // ─── Detail view ─────────────────────────────────────────────────────────────

  if (view === "detail") {
    const c = detail?.customer ?? null;
    const detailLifetimeValueCents =
      detail?.summary?.lifetime_value_cents ?? Math.round((detail?.summary?.lifetime_value || 0) * 100);

    return (
      <>
        <UndoToast toast={undoToast} onDismiss={() => setUndoToast(null)} />

        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <button
                type="button"
                onClick={backToList}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
              >
                ← Back to Customers
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-xl font-bold text-[rgb(var(--fg))]">
                  {c ? displayName(c) : "Customer"}
                </h2>
                {c ? <KindPill kind={c.kind} /> : null}
                {getDisplayTags(detail?.tag?.tag ?? null, detailLifetimeValueCents).map((pill) => (
                  <TagPill key={pill} tag={pill} />
                ))}
              </div>

              <p className="text-sm text-[rgb(var(--muted))]">
                Customer profile, CRM tag, lifetime value, and full booking history.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {c?.kind === "lead" ? (
                <motion.button
                  type="button"
                  onClick={sendInvite}
                  disabled={detailLoading || inviteBusy || !selected}
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  <Mail className="h-4 w-4" />
                  {inviteBusy ? "Sending…" : "Send Account Invite"}
                </motion.button>
              ) : null}

              <button
                type="button"
                onClick={() => selected && openDetail(selected.kind, selected.public_id)}
                disabled={detailLoading || !selected}
                className="inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {err ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                <span>{err}</span>
                <button type="button" onClick={() => setErr(null)}>
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ) : null}
            {notice ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              >
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice(null)}>
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {detailLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading customer…
            </div>
          ) : null}

          {!detailLoading && detail && c ? (
            <>
              {/* Profile + Tag */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Profile card */}
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-sky-500/10 text-sky-300">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[rgb(var(--fg))]">Profile</div>
                        <div className="text-xs text-[rgb(var(--muted))]">Contact and account information</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <DetailRow label="Name" value={displayName(c)} />
                      <DetailRow label="Account type" value={formatAccountTypeLabel(c.account_type)} />
                      <DetailRow label="Email" value={c.email || "—"} />
                      <DetailRow label="Phone" value={c.phone || "—"} />
                      <div className="sm:col-span-2">
                        <DetailRow label="Address" value={c.address || "—"} />
                      </div>
                      <DetailRow label={c.kind === "lead" ? "Lead ID" : "Customer ID"} value={c.public_id} mono />
                      <DetailRow label="Created" value={formatCreated(c.created_at)} />
                    </div>
                  </div>
                </div>

                {/* Tag card */}
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-purple-500/10 text-purple-300">
                        <Tag className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[rgb(var(--fg))]">CRM Tag</div>
                        <div className="text-xs text-[rgb(var(--muted))]">Classification visible to admins</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-3">
                      <TagSelector value={tagValue} onChange={setTagValue} disabled={tagBusy} />

                      <textarea
                        value={tagNote}
                        onChange={(e) => setTagNote(e.target.value)}
                        placeholder="Optional note (visible to admins)…"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none"
                        rows={3}
                        disabled={tagBusy}
                      />

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-[rgb(var(--muted))]">
                          Last updated: {detail.tag?.updated_at ? formatCreated(detail.tag.updated_at) : "—"}
                        </div>

                        <motion.button
                          type="button"
                          onClick={saveTag}
                          disabled={tagBusy}
                          whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-fg))] shadow disabled:opacity-60"
                        >
                          {tagBusy ? (
                            <>
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Saving…
                            </>
                          ) : (
                            "Save Tag"
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary stats */}
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <div className="border-b border-white/[0.07] bg-white/[0.03] px-5 py-3">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">Booking Summary</div>
                  <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                    Lifetime value reflects completed bookings using final price first, then initial price.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                  <StatBox label="In Progress" value={detail.summary.counts.in_progress} />
                  <StatBox label="Completed" value={detail.summary.counts.completed} />
                  <StatBox label="Cancelled" value={detail.summary.counts.cancelled} />
                  <StatBox label="Lifetime Value" value={formatMoneyFromCents(detailLifetimeValueCents)} />
                </div>
              </div>

              {/* Booking sections */}
              <div className="space-y-5">
                <BookingGroupSection
                  key={`${c.public_id}-inprogress-${detail.bookings.in_progress.length}`}
                  title="In-Progress Bookings"
                  subtitle="pending • accepted • assigned"
                  bookings={detail.bookings.in_progress}
                  emptyText="No in-progress bookings."
                  initiallyExpanded={detail.bookings.in_progress.length > 0 && detail.bookings.in_progress.length <= 3}
                />

                <BookingGroupSection
                  key={`${c.public_id}-completed-${detail.bookings.completed.length}`}
                  title="Completed Bookings"
                  bookings={detail.bookings.completed as Array<AdminCustomerBookingRow & { effective_price_cents?: number | null }>}
                  emptyText="No completed bookings."
                  initiallyExpanded={detail.bookings.completed.length > 0 && detail.bookings.completed.length <= 3}
                  showCompletedPrice
                />

                <BookingGroupSection
                  key={`${c.public_id}-cancelled-${detail.bookings.cancelled.length}`}
                  title="Cancelled Bookings"
                  bookings={detail.bookings.cancelled}
                  emptyText="No cancelled bookings."
                  initiallyExpanded={detail.bookings.cancelled.length > 0 && detail.bookings.cancelled.length <= 3}
                />
              </div>
            </>
          ) : null}
        </div>
      </>
    );
  }

  // ─── List view ───────────────────────────────────────────────────────────────

  return (
    <>
      <UndoToast toast={undoToast} onDismiss={() => setUndoToast(null)} />

      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[rgb(var(--fg))]">Customers</h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Registered customers and leads. Auto-refreshes every 60s.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {bulkSelected.size > 0 ? (
              <button
                type="button"
                onClick={clearBulkSelect}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
              >
                Clear ({bulkSelected.size})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => refresh({ page: 1 })}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk tag bar */}
        <AnimatePresence>
          {bulkSelected.size > 0 ? (
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.07] px-4 py-3"
            >
              <span className="text-sm font-semibold text-sky-300">
                {bulkSelected.size} selected
              </span>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((item) => {
                  const meta = getTagMeta(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setBulkTagValue(item.key)}
                      className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:opacity-90"
                      style={{
                        borderColor: bulkTagValue === item.key ? meta.border : "rgba(255,255,255,0.10)",
                        background: bulkTagValue === item.key ? meta.bg : "rgba(255,255,255,0.03)",
                        color: bulkTagValue === item.key ? meta.text : "rgb(var(--muted))",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {bulkTagValue ? (
                <motion.button
                  type="button"
                  onClick={bulkApplyTag}
                  disabled={bulkTagBusy}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {bulkTagBusy ? "Applying…" : `Apply "${getTagMeta(bulkTagValue).label}"`}
                </motion.button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Search */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  const next = qInput.trim();
                  setQApplied(next);
                  setPage(1);
                  await refresh({ page: 1, q: next });
                }
              }}
              placeholder="Search name, email, phone, address…"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none"
            />
            <div className="flex gap-2 md:w-auto">
              <button
                type="button"
                onClick={async () => {
                  const next = qInput.trim();
                  setQApplied(next);
                  setPage(1);
                  await refresh({ page: 1, q: next });
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.06] md:flex-none"
              >
                Search
              </button>
              <button
                type="button"
                onClick={async () => {
                  setQInput("");
                  setQApplied("");
                  setPage(1);
                  await refresh({ page: 1, q: "" });
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.05] md:flex-none"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-[rgb(var(--muted))]">
              Showing {sorted.length} of {total} • Page {page}/{totalPages}
              {qApplied ? ` • "${qApplied}"` : ""}
            </div>
            {sorted.length > 1 ? (
              <button
                type="button"
                onClick={allSelected ? clearBulkSelect : selectAll}
                className="text-xs text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))]"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            ) : null}
          </div>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {err ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              <span>{err}</span>
              <button type="button" onClick={() => setErr(null)}><X className="h-4 w-4" /></button>
            </motion.div>
          ) : null}
          {notice ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
            >
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading customers…
          </div>
        ) : null}

        {!loading && sorted.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">No customers found</div>
            <div className="mt-1 text-sm text-[rgb(var(--muted))]">Try clearing your search filter.</div>
          </div>
        ) : null}

        {/* Customer list */}
        {!loading && sorted.length > 0 ? (
          <section className="space-y-3">
            <div className="grid gap-3">
              {sorted.map((c) => {
                const displayTags = getDisplayTags(c.crm_tag ?? null, c.lifetime_value_cents);
                const cardKey = `${c.kind}:${c.public_id}`;
                const isSelected = bulkSelected.has(cardKey);

                return (
                  <div
                    key={cardKey}
                    className="group relative overflow-hidden rounded-2xl border transition-all"
                    style={{
                      borderColor: isSelected ? "rgba(56,189,248,0.35)" : "rgba(255,255,255,0.08)",
                      background: isSelected ? "rgba(56,189,248,0.04)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                    <div className="flex items-start gap-3 p-4">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleBulkSelect(cardKey)}
                        className="mt-0.5 shrink-0 text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))]"
                        aria-label={isSelected ? "Deselect" : "Select for bulk action"}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="h-5 w-5 text-sky-400" />
                        ) : (
                          <Square className="h-5 w-5 opacity-40 group-hover:opacity-100" />
                        )}
                      </button>

                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
                        <User className="h-5 w-5" />
                      </div>

                      {/* Main content - clickable */}
                      <button
                        type="button"
                        onClick={() => openDetail(c.kind, c.public_id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                                {displayName(c)}
                              </span>
                              <span className="text-xs text-[rgb(var(--muted))]">
                                {formatAccountTypeLabel(c.account_type)}
                              </span>
                            </div>

                            <div className="mt-2 grid gap-1 sm:grid-cols-2">
                              <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{c.phone || "—"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{c.email || "—"}</span>
                              </div>
                              {c.address ? (
                                <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))] sm:col-span-2">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{c.address}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <KindPill kind={c.kind} />
                            {displayTags.map((pill) => (
                              <TagPill key={pill} tag={pill} />
                            ))}
                          </div>
                        </div>

                        {/* Stats strip */}
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <StatBox label="Open" value={c.open_bookings} />
                          <StatBox label="Completed" value={c.completed_bookings} />
                          <StatBox label="Cancelled" value={c.cancelled_bookings} />
                          <StatBox label="Lifetime" value={formatMoneyFromCents(c.lifetime_value_cents)} />
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!canPrev) return;
                    const nextPage = page - 1;
                    setPage(nextPage);
                    await refresh({ page: nextPage });
                  }}
                  disabled={!canPrev}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  ← Prev
                </button>

                <div className="text-center text-xs text-[rgb(var(--muted))]">
                  Page {page} of {totalPages}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!canNext) return;
                    const nextPage = page + 1;
                    setPage(nextPage);
                    await refresh({ page: nextPage });
                  }}
                  disabled={!canNext}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
