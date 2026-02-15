"use client";

import { useEffect, useMemo, useState } from "react";
import { getBookingsMetrics, type BookingsMetricsResponse } from "../../lib/api/adminMetrics";

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function monthLabel(monthStartIso: string) {
  const d = new Date(monthStartIso);
  if (Number.isNaN(d.getTime())) return monthStartIso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function toMonthValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`; // for <input type="month">
}

function dateOnlyFromMonthStart(monthValue: string) {
  // monthValue: YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return null;
  return `${monthValue}-01`; // YYYY-MM-01
}

function dateOnlyEndExclusiveFromMonthEnd(monthValue: string) {
  // returns YYYY-MM-DD for the *day after* month end (exclusive end date)
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return null;
  const [y, m] = monthValue.split("-").map(Number);
  const firstOfNext = new Date(Date.UTC(y, m, 1)); // month is 1-based; Date.UTC expects 0-based, but using "m" gives next month automatically
  const yyyy = firstOfNext.getUTCFullYear();
  const mm = String(firstOfNext.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(firstOfNext.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateOnlyToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function BookingsOverview() {
  // ✅ Default range: last 90 days (rolling from today)
  const defaultStartMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return toMonthValue(start);
  }, []);

  const defaultEndMonth = useMemo(() => toMonthValue(new Date()), []);

  const [fromMonth, setFromMonth] = useState<string>(defaultStartMonth);
  const [toMonth, setToMonth] = useState<string>(defaultEndMonth);

  // rolling default uses TODAY as end_exclusive (not end of month)
  const [useRolling90End, setUseRolling90End] = useState<boolean>(true);

  const [data, setData] = useState<BookingsMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Build query range
  const range = useMemo(() => {
    const start = dateOnlyFromMonthStart(fromMonth) ?? undefined;

    // If rolling end is enabled, end_exclusive = today (rolling)
    // else end_exclusive = day after end month
    const end = useRolling90End
      ? dateOnlyToday()
      : (dateOnlyEndExclusiveFromMonthEnd(toMonth) ?? undefined);

    return { start, end };
  }, [fromMonth, toMonth, useRolling90End]);

  // Fetch on range change
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await getBookingsMetrics(range);
        if (!alive) return;
        setData(res);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load bookings metrics");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [range]);

  const totals = data?.totals;

  const series = useMemo(() => {
    return data?.monthly ?? [];
  }, [data?.monthly]);

  const maxCreated = useMemo(() => {
    return series.reduce((m, r) => Math.max(m, Number(r.created_count || 0)), 0);
  }, [series]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Bookings</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Range-based metrics (default: last 90 days)
          </div>
        </div>

        {/* Month/year range controls */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
              From
            </div>
            <input
              type="month"
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
              To
            </div>
            <input
              type="month"
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              disabled={useRolling90End}
              title={useRolling90End ? "Disabled because Rolling end is ON" : "Select end month"}
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          >
            <input
              type="checkbox"
              checked={useRolling90End}
              onChange={(e) => setUseRolling90End(e.target.checked)}
            />
            Rolling end (today)
          </label>
        </div>
      </div>

      {data?.range ? (
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Showing: {data.range.start} → {data.range.end_exclusive} (exclusive) • {data.range.days} days
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading bookings metrics…
        </div>
      ) : totals ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard title="Bookings (range)" value={fmt(totals.bookings_in_range)} />
            <KpiCard title="Completed (range)" value={fmt(totals.completed_in_range)} />
            <KpiCard title="Cancelled (range)" value={fmt(totals.cancelled_in_range)} />
            <KpiCard title="Completion rate (range)" value={`${totals.completion_rate_percent}%`} />

            <KpiCard title="Pending (range)" value={fmt(totals.pending_in_range)} />
            <KpiCard title="Accepted (range)" value={fmt(totals.accepted_in_range)} />
            <KpiCard title="Assigned (range)" value={fmt(totals.assigned_in_range)} />
            <div />
          </div>

          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="text-sm font-semibold">Monthly bookings (within range)</div>

            {series.length === 0 ? (
              <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                No data yet.
              </div>
            ) : (
              <div className="space-y-2">
                {series.map((r) => {
                  const created = Number(r.created_count || 0);
                  const pct = maxCreated > 0 ? Math.round((created / maxCreated) * 100) : 0;

                  return (
                    <div key={r.month_start} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3 text-sm" style={{ color: "rgb(var(--muted))" }}>
                        {monthLabel(r.month_start)}
                      </div>

                      <div className="col-span-7">
                        <div
                          className="h-3 rounded-full border overflow-hidden"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${pct}%`,
                              background: "rgb(var(--text))",
                              opacity: 0.15,
                            }}
                          />
                        </div>
                      </div>

                      <div className="col-span-2 text-right text-sm font-semibold">{fmt(created)}</div>

                      <div className="col-span-12 -mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Completed: {fmt(Number(r.completed_count || 0))} • Cancelled:{" "}
                        {fmt(Number(r.cancelled_count || 0))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* optional all-time quick glance */}
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard title="All-time bookings" value={fmt(totals.bookings_all_time)} />
            <KpiCard title="All-time completed" value={fmt(totals.completed_all_time)} />
            <KpiCard title="All-time cancelled" value={fmt(totals.cancelled_all_time)} />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No bookings data yet.
        </div>
      )}
    </section>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {title}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}