"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock, Download, MapPin, Phone, User, X } from "lucide-react";
import {
  adminGetCompletedFilters,
  adminListCompletedBookings,
  type AdminBookingRow,
} from "../../../../lib/api/adminBookings";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;
  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

function formatCreated(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function formatElapsedSince(ts: string) {
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "—";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatNotes(notes: string | null) {
  const n = (notes ?? "").trim();
  return n.length ? n : null;
}

function formatCompletedBy(b: AdminBookingRow) {
  const fn = (b.completed_by_first_name ?? "").trim();
  const ln = (b.completed_by_last_name ?? "").trim();
  const name = [fn, ln].filter(Boolean).join(" ");
  const completedAt = b.completed_at ?? b.completed_event_at ?? null;
  return { name: name || null, completedAt };
}

function formatDateTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

type PersonKind = "lead" | "registered";

function getKind(b: AdminBookingRow): PersonKind {
  return b.lead_public_id ? "lead" : "registered";
}

function getBookee(b: AdminBookingRow) {
  const isLead = !!b.lead_public_id;
  const first = b.bookee_first_name ?? b.customer_first_name ?? b.lead_first_name ?? null;
  const last = b.bookee_last_name ?? b.customer_last_name ?? b.lead_last_name ?? null;
  const email = b.bookee_email ?? b.customer_email ?? b.lead_email ?? null;
  const phone = b.bookee_phone ?? b.customer_phone ?? b.lead_phone ?? null;
  const accountType = b.bookee_account_type ?? b.customer_account_type ?? b.lead_account_type ?? null;
  const name = [first, last].filter(Boolean).join(" ").trim();
  const leadName = `${(b.lead_first_name ?? "").trim()} ${(b.lead_last_name ?? "").trim()}`.trim();
  const customerName = `${(b.customer_first_name ?? "").trim()} ${(b.customer_last_name ?? "").trim()}`.trim();
  const displayName = (isLead ? leadName : customerName) || name || customerName || leadName || email || "—";
  return {
    displayName,
    email: email ?? "—",
    phone: phone ?? "—",
    accountType: accountType ?? "—",
    customerAddress: b.customer_address ?? null,
  };
}

// ─── CSV export ────────────────────────────────────────────────────────────────

function escapeCsv(val: string | null | undefined) {
  const s = String(val ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function exportToCsv(rows: AdminBookingRow[]) {
  const headers = [
    "Booking ID",
    "Service",
    "Customer",
    "Customer Kind",
    "Email",
    "Phone",
    "Address",
    "Scheduled",
    "Created",
    "Completed At",
    "Completed By",
    "SLA",
    "Notes",
  ];

  const csvRows = rows.map((b) => {
    const bookee = getBookee(b);
    const meta = formatCompletedBy(b);
    return [
      b.public_id,
      b.service_title,
      bookee.displayName,
      getKind(b),
      bookee.email,
      bookee.phone,
      b.address || bookee.customerAddress || "",
      formatRange(b.starts_at, b.ends_at),
      formatCreated(b.created_at),
      meta.completedAt ? formatDateTime(meta.completedAt) : "",
      meta.name ?? "",
      formatElapsedSince(b.created_at),
      (b.notes ?? "").trim(),
    ].map(escapeCsv);
  });

  const csv = [headers.map(escapeCsv), ...csvRows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `completed-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Pill ──────────────────────────────────────────────────────────────────────

function KindPill({ kind }: { kind: PersonKind }) {
  const isLead = kind === "lead";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
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

// ─── Job card ──────────────────────────────────────────────────────────────────

function JobCard({ b }: { b: AdminBookingRow }) {
  const [expanded, setExpanded] = useState(false);
  const meta = formatCompletedBy(b);
  const kind = getKind(b);
  const bookee = getBookee(b);
  const notes = formatNotes(b.notes);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/[0.12]">
      {/* Green accent top strip */}
      <div className="absolute inset-x-0 top-0 h-px bg-emerald-500/30" />
      <div className="absolute inset-x-0 top-0 h-12" style={{ background: "linear-gradient(to right, rgba(34,197,94,0.07), transparent)" }} />

      <div className="relative p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                    {b.service_title}
                  </span>
                  <KindPill kind={kind} />
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                Completed
              </span>
            </div>

            <div className="mt-2 grid gap-1.5">
              <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {bookee.displayName}
                  {bookee.accountType !== "—" ? ` · ${bookee.accountType}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formatRange(b.starts_at, b.ends_at)}</span>
              </div>
              {(b.address || bookee.customerAddress) ? (
                <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{b.address || bookee.customerAddress}</span>
                </div>
              ) : null}
              {meta.completedAt ? (
                <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Completed {formatDateTime(meta.completedAt)}
                    {meta.name ? ` by ${meta.name}` : ""}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Phone</div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm">
                    <Phone className="h-3 w-3 text-[rgb(var(--muted))]" />
                    {bookee.phone}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Email</div>
                  <div className="mt-1 break-all text-sm">{bookee.email}</div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 sm:col-span-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Address</div>
                  <div className="mt-1 text-sm">{b.address || bookee.customerAddress || "—"}</div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Booking ID</div>
                  <div className="mt-1 break-all font-mono text-xs text-[rgb(var(--muted))]">{b.public_id}</div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Created / SLA</div>
                  <div className="mt-1 text-sm">{formatCreated(b.created_at)}</div>
                  <div className="text-xs text-[rgb(var(--muted))]">Age: {formatElapsedSince(b.created_at)}</div>
                </div>
              </div>

              {notes ? (
                <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Customer Notes</div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-sm">{notes}</div>
                </div>
              ) : null}

              {meta.name ? (
                <div className="mt-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/70">Completed By</div>
                  <div className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                    {meta.name}
                    {b.completed_by_phone ? (
                      <span className="ml-2 font-normal text-[rgb(var(--muted))]">{b.completed_by_phone}</span>
                    ) : null}
                  </div>
                  {meta.completedAt ? (
                    <div className="text-xs text-[rgb(var(--muted))]">{formatDateTime(meta.completedAt)}</div>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-[rgb(var(--muted))] transition hover:bg-white/[0.06] hover:text-[rgb(var(--fg))] sm:w-auto"
            aria-expanded={expanded}
          >
            {expanded ? "Show less ↑" : "Show details ↓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCompletedJobsTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminBookingRow[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [days, setDays] = useState<number[]>([]);

  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [day, setDay] = useState<number | "">("");

  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");

  async function loadYears() {
    const r = await adminGetCompletedFilters({});
    if ("years" in r) setYears(r.years || []);
  }

  async function loadMonths(y: number) {
    const r = await adminGetCompletedFilters({ year: y });
    if ("months" in r) setMonths(r.months || []);
  }

  async function loadDays(y: number, m: number) {
    const r = await adminGetCompletedFilters({ year: y, month: m });
    if ("days" in r) setDays(r.days || []);
  }

  async function refresh(opts?: { page?: number; pageSize?: number; q?: string }) {
    const nextPage = opts?.page ?? page;
    const nextSize = opts?.pageSize ?? pageSize;
    const nextQ = opts?.q ?? qApplied;

    const res = await adminListCompletedBookings({
      page: nextPage,
      pageSize: nextSize,
      year: year === "" ? undefined : year,
      month: month === "" ? undefined : month,
      day: day === "" ? undefined : day,
      q: nextQ || undefined,
    });

    setRows(res.bookings || []);
    setPage(res.page || nextPage);
    setPageSize(res.pageSize || nextSize);
    setTotal(res.total || 0);
    setTotalPages(res.totalPages || 1);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await loadYears();
        if (!alive) return;
        await refresh({ page: 1, pageSize: 30 });
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load completed jobs");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      if (year === "") {
        setMonths([]);
        setDays([]);
        setMonth("");
        setDay("");
        return;
      }
      setMonth("");
      setDay("");
      setDays([]);
      await loadMonths(year);
    })().catch(() => {});
  }, [year]);

  useEffect(() => {
    (async () => {
      if (year === "" || month === "") {
        setDays([]);
        setDay("");
        return;
      }
      setDay("");
      await loadDays(year, month);
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const canLoadMore = pageSize < 100;
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const sorted = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[rgb(var(--fg))]">Completed Jobs</h2>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Completed bookings with SLA metrics. Filter by date or search by name, address, or notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sorted.length > 0 ? (
            <motion.button
              type="button"
              onClick={() => exportToCsv(sorted)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </motion.button>
          ) : null}
          <button
            type="button"
            onClick={() => refresh({ page: 1 })}
            disabled={loading}
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
        <div className="grid gap-2 md:grid-cols-4">
          <select
            className="h-10 rounded-xl border border-white/10 bg-[rgb(var(--card))] px-3 text-sm focus:outline-none"
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Year (All)</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            className="h-10 rounded-xl border border-white/10 bg-[rgb(var(--card))] px-3 text-sm focus:outline-none disabled:opacity-50"
            value={month}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
            disabled={year === ""}
          >
            <option value="">Month (All)</option>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            className="h-10 rounded-xl border border-white/10 bg-[rgb(var(--card))] px-3 text-sm focus:outline-none disabled:opacity-50"
            value={day}
            onChange={(e) => setDay(e.target.value ? Number(e.target.value) : "")}
            disabled={year === "" || month === ""}
          >
            <option value="">Day (All)</option>
            {days.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="flex gap-2">
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
              placeholder="Search name, address, notes…"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                const next = qInput.trim();
                setQApplied(next);
                setPage(1);
                await refresh({ page: 1, q: next });
              }}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold transition hover:bg-white/[0.06]"
            >
              Go
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-[rgb(var(--muted))]">
            Showing {sorted.length} of {total} • Page {page}/{totalPages} • {pageSize}/page
            {qApplied ? ` • "${qApplied}"` : ""}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setPage(1);
                await refresh({ page: 1 });
              }}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-semibold transition hover:bg-white/[0.06]"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={async () => {
                setYear("");
                setMonth("");
                setDay("");
                setQInput("");
                setQApplied("");
                setPage(1);
                setPageSize(30);
                await loadYears();
                await refresh({ page: 1, pageSize: 30, q: "" });
              }}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm font-semibold transition hover:bg-white/[0.05]"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!canLoadMore) return;
                const nextSize = Math.min(100, pageSize + 10);
                setPageSize(nextSize);
                setPage(1);
                await refresh({ page: 1, pageSize: nextSize });
              }}
              disabled={!canLoadMore}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-semibold transition hover:bg-white/[0.06] disabled:opacity-50"
              title="Increase results per page"
            >
              +10/page
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {err ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <span>{err}</span>
            <button type="button" onClick={() => setErr(null)}>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading completed jobs…
        </div>
      ) : null}

      {!loading && sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
          <div className="text-sm font-semibold text-[rgb(var(--fg))]">No completed jobs found</div>
          <div className="mt-1 text-sm text-[rgb(var(--muted))]">Try clearing filters or search.</div>
        </div>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <section className="space-y-3">
          <div className="grid gap-3">
            {sorted.map((b) => <JobCard key={b.public_id} b={b} />)}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (page <= 1) return;
                  const nextPage = page - 1;
                  setPage(nextPage);
                  await refresh({ page: nextPage });
                }}
                disabled={!canPrev}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                ← Prev
              </button>

              <div className="text-xs text-[rgb(var(--muted))]">Page {page} of {totalPages}</div>

              <button
                type="button"
                onClick={async () => {
                  if (page >= totalPages) return;
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
  );
}
