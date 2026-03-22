// frontend/src/components/su-dashboard/BookingsOverview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Download } from "lucide-react";
import { RangeDropdown, type RangePreset } from "./RangeDropdown";
import {
  getBookingsMetrics,
  type BookingsMetricsResponse,
  downloadCompletedBookingsCsv,
} from "../../lib/api/adminMetrics";
import { MonthlyBookingsCard } from "../../components/ui/monthly-bookings-card";

function fmt(n: number) { return Number.isFinite(n) ? n.toLocaleString() : "0"; }
function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateOnly(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function dateOnlyToday() { return dateOnly(new Date()); }
function daysAgoISO(days: number) { return dateOnly(new Date(new Date().getTime() - days * 86400000)); }
function monthsAgoFirstDay(months: number) {
  const d = new Date(); d.setMonth(d.getMonth() - months); d.setDate(1); return dateOnly(d);
}

function presetRange(p: RangePreset) {
  const months = p === "1m" ? 1 : p === "3m" ? 3 : p === "6m" ? 6 : 12;
  return { start: monthsAgoFirstDay(months), end: dateOnlyToday() };
}

export default function BookingsOverview() {
  const [preset, setPreset] = useState<RangePreset | null>(null);
  const [customStart, setCustomStart] = useState(() => daysAgoISO(90));
  const [customEnd, setCustomEnd] = useState(() => dateOnlyToday());

  const [data, setData] = useState<BookingsMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  function handlePreset(p: RangePreset) {
    setPreset(p);
    const r = presetRange(p);
    setCustomStart(r.start);
    setCustomEnd(r.end);
  }

  const range = useMemo(() => ({
    start: customStart || undefined,
    end: customEnd || undefined,
  }), [customStart, customEnd]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr(null);
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

  async function onExportCsv() {
    try {
      setExporting(true);
      const res = await downloadCompletedBookingsCsv(range);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `completed_bookings_${range.start || "start"}_to_${range.end || "end"}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-base font-semibold">Bookings</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Range-based metrics with monthly trend (default: last 90 days)
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RangeDropdown
            preset={preset}
            onPreset={handlePreset}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={(v) => { setCustomStart(v); setPreset(null); }}
            onCustomEnd={(v) => { setCustomEnd(v); setPreset(null); }}
          />
          <button type="button" onClick={onExportCsv} disabled={exporting || loading}
            title="Export completed bookings CSV"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <Download className="h-4 w-4" style={{ color: "rgb(var(--muted))" }} />
          </button>
          <button type="button" onClick={() => setRefreshNonce((n) => n + 1)} disabled={loading}
            title="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} style={{ color: "rgb(var(--muted))" }} />
          </button>
        </div>
      </div>

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
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard title="Created (range)" value={fmt(totals.bookings_in_range)} />
            <KpiCard title="Completed (range)" value={fmt(totals.completed_in_range)} valueColor="rgb(16,185,129)" />
            <KpiCard title="Cancelled (range)" value={fmt(totals.cancelled_in_range)} />
            <KpiCard title="Completion rate" value={`${Number(totals.completion_rate_percent || 0)}%`} valueColor={completionColor} />
          </div>

          <div className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <div className="text-sm font-semibold">Active Pipeline</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                { label: "Pending",  value: totals.pending_in_range,  color: "rgb(234,179,8)" },
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

          <MonthlyBookingsCard series={series} />

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
