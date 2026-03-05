// frontend/src/app/account/admin/BookingsOverview.tsx
// (Use your existing path — this is a full drop-in for the component file content.)
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getBookingsMetrics,
  type BookingsMetricsResponse,
  downloadCompletedBookingsCsv,
} from "../../lib/api/adminMetrics";
import { MonthlyBookingsCard } from "../../components/ui/monthly-bookings-card";

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
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
  const firstOfNext = new Date(Date.UTC(y, m, 1)); // next month
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

function dateOnlyDaysAgo(days: number) {
  const now = new Date();
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
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

  // ✅ Advanced mode: day-level range + export
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [advStart, setAdvStart] = useState<string>(() => dateOnlyDaysAgo(90));
  const [advEnd, setAdvEnd] = useState<string>(() => dateOnlyToday()); // exclusive end
  const [exporting, setExporting] = useState<boolean>(false);

  const [data, setData] = useState<BookingsMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Refresh without changing the selected range
  const [refreshNonce, setRefreshNonce] = useState(0);
  function refreshNow() {
    setRefreshNonce((n) => n + 1);
  }

  function reset90d() {
    // resets BOTH month controls + advanced controls back to default 90d rolling to today
    setFromMonth(defaultStartMonth);
    setToMonth(defaultEndMonth);
    setUseRolling90End(true);
    setAdvStart(dateOnlyDaysAgo(90));
    setAdvEnd(dateOnlyToday());
  }

  // Build query range
  const range = useMemo(() => {
    // If advanced is enabled, use day-level controls
    if (showAdvanced) {
      return { start: advStart || undefined, end: advEnd || undefined };
    }

    const start = dateOnlyFromMonthStart(fromMonth) ?? undefined;

    // If rolling end is enabled, end_exclusive = today (rolling)
    // else end_exclusive = day after end month
    const end = useRolling90End ? dateOnlyToday() : (dateOnlyEndExclusiveFromMonthEnd(toMonth) ?? undefined);

    return { start, end };
  }, [showAdvanced, advStart, advEnd, fromMonth, toMonth, useRolling90End]);

  // Fetch on range change OR refresh click
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
  }, [range, refreshNonce]);

  const totals = data?.totals;

  const series = useMemo(() => data?.monthly ?? [], [data?.monthly]);

  async function onExportCompletedCsv() {
    try {
      setExporting(true);

      const res = await downloadCompletedBookingsCsv(range);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      const s = range.start || "start";
      const e = range.end || "end";
      a.download = `completed_bookings_${s}_to_${e}.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Bookings</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Range-based metrics (default: last 90 days)
          </div>
        </div>

        {/* Controls + actions */}
        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={refreshNow}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={loading}
            title="Refresh metrics for the current range"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>

          <button
            type="button"
            onClick={reset90d}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            title="Reset to last 90 days (rolling to today)"
          >
            Reset 90d
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            title="Advanced date range + CSV export"
          >
            {showAdvanced ? "Hide advanced" : "Advanced"}
          </button>
        </div>
      </div>

      {/* Month/year range controls (hide while advanced is on) */}
      {!showAdvanced ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Tip: Use month range for quick rollups. Turn on Advanced for day-level range + export.
          </div>

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

            <label
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
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
      ) : (
        // Advanced controls
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Advanced</div>
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Day-level range + export completed bookings to CSV for owner auditing.
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  Start
                </div>
                <input
                  type="date"
                  value={advStart}
                  onChange={(e) => setAdvStart(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  End (exclusive)
                </div>
                <input
                  type="date"
                  value={advEnd}
                  onChange={(e) => setAdvEnd(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                />
              </div>

              <button
                type="button"
                onClick={onExportCompletedCsv}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                disabled={exporting || loading}
                title="Export completed bookings in this date range"
              >
                {exporting ? "Exporting…" : "Export Completed CSV"}
              </button>
            </div>
          </div>

          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Export includes: service, time range, customer name/type, phone/email, address, booking id, created, notes,
            completed by, completed at.
          </div>
        </div>
      )}

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
            <KpiCard title="Completion rate (range)" value={`${Number(totals.completion_rate_percent || 0)}%`} />

            <KpiCard title="Pending (range)" value={fmt(totals.pending_in_range)} />
            <KpiCard title="Accepted (range)" value={fmt(totals.accepted_in_range)} />
            <KpiCard title="Assigned (range)" value={fmt(totals.assigned_in_range)} />
            <div />
          </div>

          {/* ✅ Replaces the non-working bars with the modern Recharts card */}
          <MonthlyBookingsCard series={series} />

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
    <div className="rounded-2xl border p-4" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {title}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}