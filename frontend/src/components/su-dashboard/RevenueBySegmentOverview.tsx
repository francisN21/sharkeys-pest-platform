// frontend/src/components/su-dashboard/RevenueBySegmentOverview.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { getRevenueBySegment, type RevenueBySegmentRow, type RevenueBySegmentMonthRow } from "../../lib/api/adminMetrics";
import { RangeDropdown, type RangePreset } from "./RangeDropdown";

function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateOnly(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function dateOnlyToday() { return dateOnly(new Date()); }
function monthsAgoFirstDay(months: number) {
  const d = new Date(); d.setMonth(d.getMonth() - months); d.setDate(1); return dateOnly(d);
}
function fmtMoney(cents: number) {
  return `$${(Number.isFinite(cents) ? cents : 0 / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtCents(cents: unknown) {
  const n = typeof cents === "number" ? cents : Number(cents ?? 0);
  return `$${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

const SEGMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  residential: { label: "Residential", color: "rgb(16,185,129)", bg: "rgba(16,185,129,0.12)" },
  business:    { label: "Business",    color: "rgb(99,102,241)",  bg: "rgba(99,102,241,0.12)" },
  unknown:     { label: "Unknown",     color: "rgb(156,163,175)", bg: "rgba(156,163,175,0.12)" },
};

type Preset = RangePreset;
function presetRange(p: Preset) {
  const months = p === "1m" ? 1 : p === "3m" ? 3 : p === "6m" ? 6 : 12;
  return { start: monthsAgoFirstDay(months), end: dateOnlyToday() };
}

export default function RevenueBySegmentOverview() {
  const [preset, setPreset] = useState<Preset>("6m");
  const [segments, setSegments] = useState<RevenueBySegmentRow[]>([]);
  const [byMonth, setByMonth] = useState<RevenueBySegmentMonthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const range = useMemo(() => presetRange(preset), [preset]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const tzOffsetMinutes = new Date().getTimezoneOffset();
      const res = await getRevenueBySegment({ ...range, tzOffsetMinutes });
      setSegments(res.by_segment ?? []);
      setByMonth(res.by_segment_month ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load segment revenue data");
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
        const tzOffsetMinutes = new Date().getTimezoneOffset();
        const res = await getRevenueBySegment({ ...range, tzOffsetMinutes });
        if (!alive) return;
        setSegments(res.by_segment ?? []);
        setByMonth(res.by_segment_month ?? []);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load segment revenue data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const totalRevenue = useMemo(() => segments.reduce((s, r) => s + num(r.revenue_cents), 0), [segments]);

  const months = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const r of byMonth) {
      if (!seen.has(r.month_start)) { seen.add(r.month_start); list.push(r.month_start); }
    }
    return list.sort();
  }, [byMonth]);

  const byMonthMap = useMemo(() => {
    const map = new Map<string, RevenueBySegmentMonthRow>();
    for (const r of byMonth) map.set(`${r.segment}::${r.month_start}`, r);
    return map;
  }, [byMonth]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Revenue by Customer Segment</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Completed booking revenue split by residential vs business customers
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
        Showing: {range.start} → {range.end} (exclusive)
      </div>

      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>{err}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading segment revenue…
        </div>
      ) : segments.length === 0 ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No completed bookings in this range.
        </div>
      ) : (
        <>
          {/* Segment cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {segments.map((seg) => {
              const meta = SEGMENT_META[seg.segment] ?? SEGMENT_META.unknown;
              const sharePct = totalRevenue > 0 ? ((num(seg.revenue_cents) / totalRevenue) * 100).toFixed(1) : "0";
              return (
                <div key={seg.segment} className="rounded-2xl border p-5 space-y-3"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-xs font-medium" style={{ color: "rgb(var(--muted))" }}>
                      {sharePct}% of revenue
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-bold">{fmtCents(seg.revenue_cents)}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                      {num(seg.completed_bookings).toLocaleString()} jobs · {num(seg.unique_customers).toLocaleString()} customers
                    </div>
                  </div>

                  {/* Share bar */}
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(var(--fg), 0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${sharePct}%`, background: meta.color }} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>Avg / booking</div>
                      <div className="text-sm font-semibold">{fmtCents(seg.avg_revenue_per_booking)}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>Avg / customer</div>
                      <div className="text-sm font-semibold">{fmtCents(seg.avg_revenue_per_customer)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly breakdown table */}
          {months.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Monthly Breakdown</div>
              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "rgb(var(--card))" }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Month</th>
                      {segments.map((seg) => {
                        const meta = SEGMENT_META[seg.segment] ?? SEGMENT_META.unknown;
                        return (
                          <th key={seg.segment} className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap"
                            style={{ color: meta.color }}>
                            {meta.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, i) => (
                      <tr key={m} style={{
                        background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)",
                        borderTop: "1px solid rgb(var(--border))",
                      }}>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{fmtMonth(m)}</td>
                        {segments.map((seg) => {
                          const cell = byMonthMap.get(`${seg.segment}::${m}`);
                          return (
                            <td key={seg.segment} className="px-4 py-3 text-right whitespace-nowrap">
                              {cell ? (
                                <span title={`${num(cell.completed_bookings)} jobs`}>
                                  {fmtCents(cell.revenue_cents)}
                                </span>
                              ) : (
                                <span style={{ color: "rgb(var(--muted))" }}>—</span>
                              )}
                            </td>
                          );
                        })}
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

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

