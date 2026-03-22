// frontend/src/components/su-dashboard/BookingsOverview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Download } from "lucide-react";
import {
  getBookingsMetrics,
  type BookingsMetricsResponse,
  downloadCompletedBookingsCsv,
} from "../../lib/api/adminMetrics";
import { MonthlyBookingsCard } from "../../components/ui/monthly-bookings-card";

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateOnly(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dateOnlyToday() { return dateOnly(new Date()); }
function dateOnlyDaysAgo(days: number) {
  return dateOnly(new Date(new Date().getTime() - days * 86400000));
}
function toMonthValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function dateOnlyFromMonthStart(mv: string) {
  if (!/^\d{4}-\d{2}$/.test(mv)) return null;
  return `${mv}-01`;
}
function dateOnlyEndExclusiveFromMonthEnd(mv: string) {
  if (!/^\d{4}-\d{2}$/.test(mv)) return null;
  const [y, m] = mv.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}
function monthsAgoMonthValue(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return toMonthValue(d);
}

type Preset = "1m" | "3m" | "6m" | "12m";

export default function BookingsOverview() {
  const defaultStartMonth = useMemo(() => {
    const start = new Date(new Date().getTime() - 90 * 86400000);
    return toMonthValue(start);
  }, []);
  const defaultEndMonth = useMemo(() => toMonthValue(new Date()), []);

  const [preset, setPreset] = useState<Preset | null>(null);
  const [fromMonth, setFromMonth] = useState<string>(defaultStartMonth);
  const [toMonth, setToMonth] = useState<string>(defaultEndMonth);
  const [useRolling90End, setUseRolling90End] = useState<boolean>(true);

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [advStart, setAdvStart] = useState<string>(() => dateOnlyDaysAgo(90));
  const [advEnd, setAdvEnd] = useState<string>(() => dateOnlyToday());
  const [exporting, setExporting] = useState<boolean>(false);

  const [data, setData] = useState<BookingsMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  function applyPreset(p: Preset) {
    setPreset(p);
    setShowAdvanced(false);
    const months = p === "1m" ? 1 : p === "3m" ? 3 : p === "6m" ? 6 : 12;
    setFromMonth(monthsAgoMonthValue(months));
    setToMonth(defaultEndMonth);
    setUseRolling90End(true);
  }

  function reset90d() {
    setPreset(null);
    setFromMonth(defaultStartMonth);
    setToMonth(defaultEndMonth);
    setUseRolling90End(true);
    setAdvStart(dateOnlyDaysAgo(90));
    setAdvEnd(dateOnlyToday());
  }

  const range = useMemo(() => {
    if (showAdvanced) return { start: advStart || undefined, end: advEnd || undefined };
    const start = dateOnlyFromMonthStart(fromMonth) ?? undefined;
    const end = useRolling90End ? dateOnlyToday() : (dateOnlyEndExclusiveFromMonthEnd(toMonth) ?? undefined);
    return { start, end };
  }, [showAdvanced, advStart, advEnd, fromMonth, toMonth, useRolling90End]);

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
    return () => { alive = false; };
  }, [range, refreshNonce]);

  async function onExportCompletedCsv() {
    try {
      setExporting(true);
      const res = await downloadCompletedBookingsCsv(range);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `completed_bookings_${range.start || "start"}_to_${range.end || "end"}.csv`;
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

  const totals = data?.totals;
  const series = useMemo(() => data?.monthly ?? [], [data?.monthly]);

  const completionColor = totals
    ? totals.completion_rate_percent >= 80 ? "rgb(16,185,129)"
      : totals.completion_rate_percent >= 50 ? "rgb(234,179,8)"
      : "rgb(239,68,68)"
    : "rgb(var(--fg))";

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Bookings</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Range-based metrics with monthly trend (default: last 90 days)
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {(["1m", "3m", "6m", "12m"] as Preset[]).map((p) => (
            <PresetBtn key={p} label={p.toUpperCase()} active={preset === p} onClick={() => applyPreset(p)} />
          ))}
          <button
            type="button"
            onClick={reset90d}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: preset === null && !showAdvanced ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)", fontWeight: preset === null && !showAdvanced ? 700 : 600 }}
          >
            90d
          </button>
          <button
            type="button"
            onClick={() => setRefreshNonce((n) => n + 1)}
            disabled={loading}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              {loading ? "Refreshing…" : "Refresh"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: showAdvanced ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)" }}
          >
            {showAdvanced ? "Hide advanced" : "Advanced"}
          </button>
        </div>
      </div>

      {/* Month range controls */}
      {!showAdvanced ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>From</div>
            <input type="month" value={fromMonth} onChange={(e) => { setPreset(null); setFromMonth(e.target.value); }}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }} />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>To</div>
            <input type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)}
              disabled={useRolling90End}
              className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }} />
          </div>
          <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}>
            <input type="checkbox" checked={useRolling90End} onChange={(e) => setUseRolling90End(e.target.checked)} />
            Rolling end (today)
          </label>
        </div>
      ) : (
        /* Advanced controls */
        <div className="rounded-2xl border p-5 space-y-3"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Advanced Range</div>
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Day-level range · export completed bookings to CSV
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Start</div>
                <input type="date" value={advStart} onChange={(e) => setAdvStart(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>End (exclusive)</div>
                <input type="date" value={advEnd} onChange={(e) => setAdvEnd(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }} />
              </div>
              <button
                type="button"
                onClick={onExportCompletedCsv}
                disabled={exporting || loading}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              >
                <span className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {exporting ? "Exporting…" : "Export CSV"}
                </span>
              </button>
            </div>
          </div>
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Export includes: service, customer name/type, phone/email, address, booking id, notes, completed by, completed at.
          </div>
        </div>
      )}

      {data?.range && (
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Showing: {data.range.start} → {data.range.end_exclusive} (exclusive) · {data.range.days} days
        </div>
      )}

      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>{err}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading bookings metrics…
        </div>
      ) : totals ? (
        <>
          {/* Primary KPIs */}
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard title="Created (range)" value={fmt(totals.bookings_in_range)} />
            <KpiCard title="Completed (range)" value={fmt(totals.completed_in_range)} valueColor="rgb(16,185,129)" />
            <KpiCard title="Cancelled (range)" value={fmt(totals.cancelled_in_range)} />
            <KpiCard title="Completion rate" value={`${Number(totals.completion_rate_percent || 0)}%`} valueColor={completionColor} />
          </div>

          {/* Pipeline status */}
          <div className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <div className="text-sm font-semibold">Active Pipeline</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                { label: "Pending", value: totals.pending_in_range, color: "rgb(234,179,8)" },
                { label: "Accepted", value: totals.accepted_in_range, color: "rgb(59,130,246)" },
                { label: "Assigned", value: totals.assigned_in_range, color: "rgb(99,102,241)" },
              ] as const).map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between rounded-xl border px-4 py-3"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}>
                  <span className="text-sm font-medium" style={{ color }}>{label}</span>
                  <span className="text-xl font-bold">{fmt(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly chart */}
          <MonthlyBookingsCard series={series} />

          {/* All-time summary */}
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

function KpiCard({ title, value, valueColor }: { title: string; value: string; valueColor?: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>{title}</div>
      <div className="mt-1 text-2xl font-semibold" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
    </div>
  );
}

function PresetBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
      style={{ borderColor: "rgb(var(--border))", background: active ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)", fontWeight: active ? 700 : 600 }}>
      {label}
    </button>
  );
}
