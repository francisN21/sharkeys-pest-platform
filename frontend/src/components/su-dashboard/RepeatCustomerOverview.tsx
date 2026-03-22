// frontend/src/components/su-dashboard/RepeatCustomerOverview.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { getRepeatCustomers, type TopRepeatCustomerRow } from "../../lib/api/adminMetrics";
import RangeDropdown, { type RangePreset } from "./RangeDropdown";

function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateOnly(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function dateOnlyToday() { return dateOnly(new Date()); }
function monthsAgoFirstDay(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  return dateOnly(d);
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

type Preset = RangePreset;
function presetRange(p: Preset) {
  const months = p === "1m" ? 1 : p === "3m" ? 3 : p === "6m" ? 6 : 12;
  return { start: monthsAgoFirstDay(months), end: dateOnlyToday() };
}

function typeBadge(type: string | null) {
  if (!type || type === "unknown") return null;
  const label = type === "business" ? "Business" : "Residential";
  const bg = type === "business" ? "rgba(99,102,241,0.12)" : "rgba(16,185,129,0.12)";
  const color = type === "business" ? "rgb(99,102,241)" : "rgb(16,185,129)";
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-medium shrink-0" style={{ background: bg, color }}>
      {label}
    </span>
  );
}

export default function RepeatCustomerOverview() {
  const [preset, setPreset] = useState<Preset>("6m");
  const [totals, setTotals] = useState<{ total_customers: number; repeat_customers: number; one_time_customers: number; repeat_rate_percent: number } | null>(null);
  const [topRepeat, setTopRepeat] = useState<TopRepeatCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const range = useMemo(() => presetRange(preset), [preset]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const res = await getRepeatCustomers(range);
      setTotals({
        total_customers: num(res.totals?.total_customers),
        repeat_customers: num(res.totals?.repeat_customers),
        one_time_customers: num(res.totals?.one_time_customers),
        repeat_rate_percent: num(res.totals?.repeat_rate_percent),
      });
      setTopRepeat(res.top_repeat ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load repeat customer data");
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
        const res = await getRepeatCustomers(range);
        if (!alive) return;
        setTotals({
          total_customers: num(res.totals?.total_customers),
          repeat_customers: num(res.totals?.repeat_customers),
          one_time_customers: num(res.totals?.one_time_customers),
          repeat_rate_percent: num(res.totals?.repeat_rate_percent),
        });
        setTopRepeat(res.top_repeat ?? []);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load repeat customer data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const rateColor = totals
    ? totals.repeat_rate_percent >= 40 ? "rgb(16,185,129)"
      : totals.repeat_rate_percent >= 20 ? "rgb(234,179,8)"
      : "rgb(var(--fg))"
    : "rgb(var(--fg))";

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Repeat Customer Rate</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Customers with 2+ non-cancelled bookings in range
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
          Loading repeat customer data…
        </div>
      ) : totals ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard title="Total customers" value={totals.total_customers.toLocaleString()} />
            <KpiCard title="Repeat customers" value={totals.repeat_customers.toLocaleString()} />
            <KpiCard title="One-time customers" value={totals.one_time_customers.toLocaleString()} />
            <KpiCard
              title="Repeat rate"
              value={`${totals.repeat_rate_percent}%`}
              valueColor={rateColor}
            />
          </div>

          {/* Loyalty bar */}
          {totals.total_customers > 0 && (
            <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                <span>Loyalty split</span>
                <span>{totals.repeat_customers} repeat · {totals.one_time_customers} one-time</span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: "rgba(var(--fg), 0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(totals.repeat_customers / totals.total_customers) * 100}%`,
                    background: rateColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* Top repeat customers */}
          {topRepeat.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Top Repeat Customers</div>
              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "rgb(var(--card))" }}>
                      {["Customer", "Type", "Total Bookings", "Completed", "Last Booking"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topRepeat.map((r, i) => (
                      <tr key={r.customer_user_id} style={{
                        background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)",
                        borderTop: "1px solid rgb(var(--border))",
                      }}>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {r.first_name} {r.last_name}
                        </td>
                        <td className="px-4 py-3">{typeBadge(r.account_type) ?? <span style={{ color: "rgb(var(--muted))" }}>—</span>}</td>
                        <td className="px-4 py-3 font-semibold">{r.booking_count}</td>
                        <td className="px-4 py-3" style={{ color: "rgb(var(--muted))" }}>{r.completed_count}</td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>{fmtDate(r.last_booking_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No booking data in this range.
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

