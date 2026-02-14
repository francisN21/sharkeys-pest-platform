"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminGetCompletedFilters,
  adminListCompletedBookings,
  type AdminBookingRow,
} from "../../../../lib/api/adminBookings";

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

export default function AdminCompletedJobsTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminBookingRow[]>([]);

  // paging + dynamic page size
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30); // 30..100
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // filters (only values that exist)
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [days, setDays] = useState<number[]>([]);

  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [day, setDay] = useState<number | "">("");

  // search
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

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when year changes → reset month/day and load months
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

  // when month changes → reset day and load days
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Completed Jobs</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Most recent completed jobs. Filter by date and search by name/address/notes.
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

      {/* Filters + Search */}
      <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
        <div className="grid gap-2 md:grid-cols-4">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Year (All)</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            value={month}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
            disabled={year === ""}
          >
            <option value="">Month (All)</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            value={day}
            onChange={(e) => setDay(e.target.value ? Number(e.target.value) : "")}
            disabled={year === "" || month === ""}
          >
            <option value="">Day (All)</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search name, street, email, notes…"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            />
            <button
              type="button"
              onClick={async () => {
                const next = qInput.trim();
                setQApplied(next);
                setPage(1);
                await refresh({ page: 1, q: next });
              }}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              Go
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Showing {sorted.length} of {total} • Page {page}/{totalPages} • {pageSize} per page
            {qApplied ? ` • Search: “${qApplied}”` : ""}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setPage(1);
                await refresh({ page: 1 });
              }}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              Apply Filters
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
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
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
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              title="Increase cards per page"
            >
              Load +10
            </button>
          </div>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading…
        </div>
      ) : null}

      {!loading && sorted.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="font-semibold">No completed jobs found</div>
          <div style={{ color: "rgb(var(--muted))" }}>Try clearing filters or search.</div>
        </div>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <section className="space-y-3">
          <div className="grid gap-3">
            {sorted.map((b) => {
              const meta = formatCompletedBy(b);

              return (
                <div
                  key={b.public_id}
                  className="rounded-2xl border p-4 space-y-3"
                  style={{ borderColor: "rgb(var(--border))" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{b.service_title}</div>
                      <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                        {formatRange(b.starts_at, b.ends_at)}
                      </div>

                      <div className="mt-2 text-sm">
                        <div className="font-semibold">
                          {b.customer_first_name} {b.customer_last_name}
                          <span className="ml-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                            ({b.customer_account_type || "—"})
                          </span>
                        </div>

                        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                          Phone: {b.customer_phone || "—"} • Email: {b.customer_email}
                        </div>

                        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                          Location: {b.address || b.customer_address || "—"}
                        </div>
                      </div>

                      <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Booking ID: <span className="font-mono">{b.public_id}</span>
                      </div>
                      <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Created: {formatCreated(b.created_at)} • SLA:{" "}
                        <span className="font-semibold">{formatElapsedSince(b.created_at)}</span>
                      </div>

                      {formatNotes(b.notes) ? (
                        <div
                          className="mt-2 rounded-xl border p-3 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        >
                          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                            Customer Notes:
                          </div>
                          <div className="mt-1 whitespace-pre-wrap break-words">{b.notes}</div>
                        </div>
                      ) : null}

                      {meta.name || meta.completedAt ? (
                        <div
                          className="mt-2 rounded-xl border p-3 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        >
                          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                            Completed By:
                          </div>
                          <div className="mt-1">
                            <div className="font-semibold">
                              {meta.name ?? "—"}
                              {b.completed_by_phone ? (
                                <span style={{ color: "rgb(var(--muted))" }}> • {b.completed_by_phone}</span>
                              ) : null}
                            </div>
                            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                              Completed at: {meta.completedAt ? formatDateTime(meta.completedAt) : "—"}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
                      Completed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
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

              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
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