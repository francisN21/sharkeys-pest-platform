// frontend/src/components/su-dashboard/LeadConversionAgeOverview.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { getLeadConversionAge, type LeadConversionAgeBucket, type LeadConversionAgeMonthRow } from "../../lib/api/adminMetrics";
import RangeDropdown, { type RangePreset } from "./RangeDropdown";

function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateOnly(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function dateOnlyToday() { return dateOnly(new Date()); }
function monthsAgoFirstDay(months: number) {
  const d = new Date(); d.setMonth(d.getMonth() - months); d.setDate(1); return dateOnly(d);
}
function fmtDays(d: number | null | undefined) {
  if (d == null || !Number.isFinite(Number(d))) return "—";
  const n = Number(d);
  if (n < 1) return "< 1 day";
  return `${n.toFixed(1)}d`;
}
function fmtMonth(ymd: string) {
  if (!/^\d{4}-\d{2}/.test(ymd)) return ymd;
  const [y, m] = ymd.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, { month: "short", year: "numeric" });
}
function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

const BUCKET_META: Record<string, { label: string; color: string }> = {
  same_day:   { label: "Same day",   color: "rgb(16,185,129)" },
  "1_to_7d":  { label: "1–7 days",   color: "rgb(59,130,246)" },
  "7_to_30d": { label: "7–30 days",  color: "rgb(234,179,8)" },
  "30_to_90d":{ label: "30–90 days", color: "rgb(249,115,22)" },
  "90d_plus": { label: "90 days+",   color: "rgb(239,68,68)" },
};

const BUCKET_ORDER = ["same_day", "1_to_7d", "7_to_30d", "30_to_90d", "90d_plus"];

type Preset = RangePreset;
function presetRange(p: Preset) {
  const months = p === "1m" ? 1 : p === "3m" ? 3 : p === "6m" ? 6 : 12;
  return { start: monthsAgoFirstDay(months), end: dateOnlyToday() };
}

export default function LeadConversionAgeOverview() {
  const [preset, setPreset] = useState<Preset>("6m");
  const [totals, setTotals] = useState<{ total_conversions: number; avg_days: number | null; min_days: number | null; max_days: number | null; median_days: number | null } | null>(null);
  const [buckets, setBuckets] = useState<LeadConversionAgeBucket[]>([]);
  const [monthly, setMonthly] = useState<LeadConversionAgeMonthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const range = useMemo(() => presetRange(preset), [preset]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const res = await getLeadConversionAge(range);
      setTotals(res.totals ?? null);
      setBuckets(res.buckets ?? []);
      setMonthly(res.monthly ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load conversion age data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await getLeadConversionAge(range);
        if (!alive) return;
        setTotals(res.totals ?? null);
        setBuckets(res.buckets ?? []);
        setMonthly(res.monthly ?? []);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load conversion age data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  // Sort buckets in logical order
  const sortedBuckets = useMemo(() => {
    const map = new Map(buckets.map((b) => [b.bucket, b]));
    return BUCKET_ORDER.map((key) => map.get(key) ?? { bucket: key as LeadConversionAgeBucket["bucket"], count: 0 });
  }, [buckets]);

  const totalBucketCount = useMemo(() => sortedBuckets.reduce((s, b) => s + num(b.count), 0), [sortedBuckets]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Lead Conversion Age</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            How long it takes for leads to become customers after their first contact
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RangeDropdown preset={preset} onPreset={setPreset} />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} style={{ color: "rgb(var(--muted))" }} />
          </button>
        </div>
      </div>

      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
        Showing: {range.start} → {range.end} (exclusive) — filtered by conversion date
      </div>

      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>{err}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading conversion age data…
        </div>
      ) : !totals || totals.total_conversions === 0 ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No lead conversions in this range.
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard title="Total conversions" value={num(totals.total_conversions).toLocaleString()} />
            <KpiCard title="Avg time" value={fmtDays(totals.avg_days)} />
            <KpiCard title="Median time" value={fmtDays(totals.median_days)} />
            <KpiCard title="Fastest / Slowest" value={`${fmtDays(totals.min_days)} / ${fmtDays(totals.max_days)}`} small />
          </div>

          {/* Bucket distribution */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <div className="text-sm font-semibold">Time-to-Convert Distribution</div>
            <div className="space-y-2">
              {sortedBuckets.map((b) => {
                const meta = BUCKET_META[b.bucket];
                const pct = totalBucketCount > 0 ? (num(b.count) / totalBucketCount) * 100 : 0;
                return (
                  <div key={b.bucket} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium" style={{ color: meta.color }}>{meta.label}</span>
                      <span style={{ color: "rgb(var(--muted))" }}>
                        {num(b.count)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(var(--fg), 0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly trend */}
          {monthly.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Monthly Trend</div>
              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "rgb(var(--card))" }}>
                      {["Month", "Conversions", "Avg Days to Convert"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((row, i) => (
                      <tr key={row.month_start} style={{
                        background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)",
                        borderTop: "1px solid rgb(var(--border))",
                      }}>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{fmtMonth(row.month_start)}</td>
                        <td className="px-4 py-3 font-semibold">{num(row.conversions).toLocaleString()}</td>
                        <td className="px-4 py-3" style={{ color: "rgb(var(--muted))" }}>{fmtDays(row.avg_days)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function KpiCard({ title, value, small }: { title: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>{title}</div>
      <div className={`mt-1 font-semibold ${small ? "text-lg" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

