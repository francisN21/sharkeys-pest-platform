"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminListCustomers,
  adminGetCustomerDetail,
  adminSetCustomerTag,
  type AdminCustomerRow,
  type AdminCustomerDetailResponse,
  type AdminCustomerKind,
  type AdminCustomerBookingRow,
} from "../../../../lib/api/adminCustomers";

const BIG_SPENDER_THRESHOLD_CENTS = 100000; // $1,000.00

const TAG_OPTIONS = [
  { key: "regular", label: "Regular" },
  { key: "good", label: "Good" },
  { key: "bad", label: "Bad" },
  { key: "vip", label: "VIP" },
  { key: "big_spender", label: "Big Spender" },
] as const;

function formatCreated(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function formatMoneyFromCents(cents?: number | null) {
  const amount = (Number(cents) || 0) / 100;
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
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
      bg: "rgba(34, 197, 94, 0.16)",
      border: "rgba(34, 197, 94, 0.35)",
      text: "rgb(187 247 208)",
    };
  }

  if (key === "good") {
    return {
      label: "Good",
      bg: "rgba(59, 130, 246, 0.14)",
      border: "rgba(59, 130, 246, 0.30)",
      text: "rgb(191 219 254)",
    };
  }

  if (key === "bad") {
    return {
      label: "Bad",
      bg: "rgba(239, 68, 68, 0.16)",
      border: "rgba(239, 68, 68, 0.30)",
      text: "rgb(254 202 202)",
    };
  }

  if (key === "regular") {
    return {
      label: "Regular",
      bg: "rgba(148, 163, 184, 0.14)",
      border: "rgba(148, 163, 184, 0.28)",
      text: "rgb(226 232 240)",
    };
  }

  if (key === "big_spender") {
    return {
      label: "Big Spender",
      bg: "rgba(168, 85, 247, 0.18)",
      border: "rgba(168, 85, 247, 0.34)",
      text: "rgb(233 213 255)",
    };
  }

  return {
    label: tag || "Tag",
    bg: "rgba(59, 130, 246, 0.14)",
    border: "rgba(59, 130, 246, 0.30)",
    text: "rgb(191 219 254)",
  };
}

function getDisplayTags(tag?: string | null, lifetimeValueCents?: number | null) {
  const pills: string[] = [];
  const normalized = normalizeTagKey(tag);

  if (normalized) pills.push(normalized);
  if ((Number(lifetimeValueCents) || 0) >= BIG_SPENDER_THRESHOLD_CENTS && normalized !== "big_spender") {
    pills.push("big_spender");
  }

  return pills;
}

function KindPill({ kind }: { kind: AdminCustomerKind }) {
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

  const meta = getTagMeta(t);

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
      style={{
        borderColor: meta.border,
        background: meta.bg,
        color: meta.text,
      }}
      title={`CRM Tag: ${meta.label}`}
    >
      {meta.label}
    </span>
  );
}

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
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
        Tags
      </div>

      <div
        className="rounded-xl border p-2"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgba(var(--bg), 0.18)",
        }}
      >
        <div className="flex min-h-12 flex-wrap items-center gap-2">
          {value ? (
            <button
              type="button"
              onClick={() => !disabled && onChange("")}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition hover:opacity-90 disabled:opacity-60"
              style={{
                ...(() => {
                  const meta = getTagMeta(value);
                  return {
                    borderColor: meta.border,
                    background: meta.bg,
                    color: meta.text,
                  };
                })(),
              }}
            >
              <span>{getTagMeta(value).label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ) : (
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              No tag selected
            </div>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border p-2"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgba(var(--bg), 0.12)",
        }}
      >
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
                style={{
                  borderColor: meta.border,
                  background: meta.bg,
                  color: meta.text,
                }}
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

function StatPill({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: number | string;
  valueClassName?: string;
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.22)" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${valueClassName}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
        {label}
      </div>
      <div className={`mt-1 break-words text-sm ${mono ? "font-mono text-[13px]" : ""}`}>{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
    >
      <div className="mb-3">
        <div className="text-sm font-semibold sm:text-base">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-xs sm:text-sm" style={{ color: "rgb(var(--muted))" }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function BookingCard({
  b,
  showPricePanel = false,
}: {
  b: AdminCustomerBookingRow & { effective_price_cents?: number | null };
  showPricePanel?: boolean;
}) {
  const hasNotes = Boolean(b.notes);
  const priceValue = formatMoneyFromCents(b.effective_price_cents);

  return (
    <div
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-0 break-words text-sm font-semibold">{b.service_title}</div>
            <span
              className="inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium sm:text-xs"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
            >
              {b.status}
            </span>
          </div>

          <div className="mt-2 break-words text-sm" style={{ color: "rgb(var(--muted))" }}>
            {formatRange(b.starts_at, b.ends_at)}
          </div>

          <div className="mt-2 break-words text-sm" style={{ color: "rgb(var(--muted))" }}>
            Location: {b.address || "—"}
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="break-words text-xs" style={{ color: "rgb(var(--muted))" }}>
              Booking ID: <span className="font-mono">{b.public_id}</span>
            </div>
            <div className="break-words text-xs" style={{ color: "rgb(var(--muted))" }}>
              Created: {formatCreated(b.created_at)}
            </div>
          </div>

          {showPricePanel ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                  Notes
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words">{hasNotes ? b.notes : "—"}</div>
              </div>

              <div
                className="rounded-xl border p-3"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                  Price
                </div>
                <div className="mt-1 text-base font-semibold">{priceValue}</div>
              </div>
            </div>
          ) : hasNotes ? (
            <div
              className="mt-3 rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                Notes
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">{b.notes}</div>
            </div>
          ) : null}
        </div>
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
            <h3 className="text-base font-semibold">{title}</h3>
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgba(var(--bg), 0.18)",
                color: "rgb(var(--muted))",
              }}
            >
              {count}
            </span>
          </div>
          {subtitle ? (
            <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {count > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
            aria-expanded={expanded}
          >
            {expanded ? "Hide bookings" : "Show bookings"}
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
        ) : null}
      </div>

      {count === 0 ? (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
        >
          {emptyText}
        </div>
      ) : expanded ? (
        <div className="grid gap-3">
          {bookings.map((b) => (
            <BookingCard key={b.public_id} b={b} showPricePanel={showCompletedPrice} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
        >
          <span style={{ color: "rgb(var(--muted))" }}>
            {count} {count === 1 ? "booking" : "bookings"} hidden. Expand this section to view them.
          </span>
        </div>
      )}
    </div>
  );
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  async function refresh(opts?: { page?: number; q?: string }) {
    const nextPage = opts?.page ?? page;
    const nextQ = opts?.q ?? qApplied;

    const res = await adminListCustomers({ page: nextPage, pageSize, q: nextQ || undefined });

    setRows(res.customers || []);
    setPage(res.page || nextPage);
    setTotal(res.total || 0);
    setTotalPages(res.totalPages || 1);
  }

  async function openDetail(kind: AdminCustomerKind, publicId: string) {
    setErr(null);
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
  }

  async function saveTag() {
    if (!selected) return;
    try {
      setTagBusy(true);
      setErr(null);
      await adminSetCustomerTag(selected.kind, selected.public_id, tagValue ? tagValue : null, tagNote ? tagNote : null);

      const d = await adminGetCustomerDetail(selected.kind, selected.public_id);
      setDetail(d);
      setTagValue(d.tag?.tag ?? "");
      setTagNote(d.tag?.note ?? "");
      refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save tag");
    } finally {
      setTagBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await refresh({ page: 1 });
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load customers");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const sorted = useMemo(() => rows, [rows]);

  if (view === "detail") {
    const c = detail?.customer ?? null;
    const detailLifetimeValueCents =
      detail?.summary?.lifetime_value_cents ?? Math.round((detail?.summary?.lifetime_value || 0) * 100);

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <button
              type="button"
              onClick={backToList}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            >
              ← Back to Customers
            </button>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <h2 className="break-words text-xl font-bold">{c ? displayName(c) : "Customer"}</h2>
              {c ? <KindPill kind={c.kind} /> : null}
              {getDisplayTags(detail?.tag?.tag ?? null, detailLifetimeValueCents).map((pill) => (
                <TagPill key={pill} tag={pill} />
              ))}
            </div>

            <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Customer profile, tag, lifetime value, and full booking history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => selected && openDetail(selected.kind, selected.public_id)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={detailLoading || !selected}
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
          >
            {err}
          </div>
        ) : null}

        {detailLoading ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
          >
            Loading…
          </div>
        ) : null}

        {!detailLoading && detail && c ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <SectionCard title="Profile" subtitle="Core contact and account information.">
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
              </SectionCard>

              <SectionCard title="Tag" subtitle="CRM classification visible to admins.">
                <div className="grid gap-3">
                  <TagSelector value={tagValue} onChange={setTagValue} disabled={tagBusy} />

                  <textarea
                    value={tagNote}
                    onChange={(e) => setTagNote(e.target.value)}
                    placeholder="Optional note (visible to admins)…"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    rows={4}
                    disabled={tagBusy}
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="break-words text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Last updated: {detail.tag?.updated_at ? formatCreated(detail.tag.updated_at) : "—"}
                    </div>

                    <button
                      type="button"
                      onClick={saveTag}
                      disabled={tagBusy}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    >
                      {tagBusy ? "Saving…" : "Save Tag"}
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Summary" subtitle="Snapshot of booking volume and current value.">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <StatPill label="In progress" value={detail.summary.counts.in_progress} />
                <StatPill label="Completed" value={detail.summary.counts.completed} />
                <StatPill label="Cancelled" value={detail.summary.counts.cancelled} />
                <StatPill label="Lifetime value" value={formatMoneyFromCents(detailLifetimeValueCents)} />
              </div>
              <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                Lifetime value reflects completed bookings using final price first, then initial price, then service base price.
              </div>
            </SectionCard>

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
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Registered customers and leads. Click a card to open the customer record.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh({ page: 1 })}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div
        className="space-y-3 rounded-2xl border p-3 sm:p-4"
        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search name, email, phone, address…"
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
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
              className="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold hover:opacity-90 md:flex-none"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              Go
            </button>

            <button
              type="button"
              onClick={async () => {
                setQInput("");
                setQApplied("");
                setPage(1);
                await refresh({ page: 1, q: "" });
              }}
              className="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold hover:opacity-90 md:flex-none"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="break-words text-xs" style={{ color: "rgb(var(--muted))" }}>
          Showing {sorted.length} of {total} • Page {page}/{totalPages}
          {qApplied ? ` • Search: “${qApplied}”` : ""}
        </div>
      </div>

      {err ? (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
        >
          {err}
        </div>
      ) : null}

      {loading ? (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
        >
          Loading…
        </div>
      ) : null}

      {!loading && sorted.length === 0 ? (
        <div
          className="space-y-2 rounded-2xl border p-6 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
        >
          <div className="font-semibold">No customers found</div>
          <div style={{ color: "rgb(var(--muted))" }}>Try clearing search.</div>
        </div>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <section className="space-y-3">
          <div className="grid gap-3">
            {sorted.map((c) => {
              const displayTags = getDisplayTags(c.crm_tag ?? null, c.lifetime_value_cents);

              return (
                <button
                  key={`${c.kind}:${c.public_id}`}
                  type="button"
                  onClick={() => openDetail(c.kind, c.public_id)}
                  className="rounded-2xl border p-3 text-left transition hover:opacity-95 sm:p-4"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <div className="min-w-0 break-words text-sm font-semibold sm:text-base">
                            {displayName(c)}
                          </div>
                          <span className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                            ({formatAccountTypeLabel(c.account_type)})
                          </span>
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="break-words text-sm" style={{ color: "rgb(var(--muted))" }}>
                            <span className="font-medium">Phone:</span> {c.phone || "—"}
                          </div>
                          <div className="break-words text-sm" style={{ color: "rgb(var(--muted))" }}>
                            <span className="font-medium">Email:</span> {c.email || "—"}
                          </div>
                        </div>

                        <div className="mt-2 break-words text-sm" style={{ color: "rgb(var(--muted))" }}>
                          <span className="font-medium">Location:</span> {c.address || "—"}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <KindPill kind={c.kind} />
                        {displayTags.map((pill) => (
                          <TagPill key={pill} tag={pill} />
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="break-words text-xs" style={{ color: "rgb(var(--muted))" }}>
                        {c.kind === "lead" ? "Lead ID" : "Customer ID"}:{" "}
                        <span className="font-mono">{c.public_id}</span>
                      </div>

                      <div className="break-words text-xs sm:text-right" style={{ color: "rgb(var(--muted))" }}>
                        Created: {formatCreated(c.created_at)}
                      </div>
                    </div>

                    <div
                      className="rounded-xl border p-3"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.22)" }}
                    >
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                        Booking Summary
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <StatPill label="Open" value={c.open_bookings} />
                        <StatPill label="Completed" value={c.completed_bookings} />
                        <StatPill label="Cancelled" value={c.cancelled_bookings} />
                        <StatPill label="Lifetime value" value={formatMoneyFromCents(c.lifetime_value_cents)} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

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
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              >
                Prev
              </button>

              <div className="text-center text-xs" style={{ color: "rgb(var(--muted))" }}>
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
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              >
                Next
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}