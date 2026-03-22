"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { getCustomersMetrics, type CustomersMetricsResponse } from "../../lib/api/adminMetrics";
import { CustomerMixCard } from "../../components/ui/customer-mix-card";

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function fmtPct(n: number) {
  return Number.isFinite(n) ? `${n}%` : "0%";
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateOnly(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dateOnlyToday() { return dateOnly(new Date()); }
function daysAgoISO(days: number) {
  return dateOnly(new Date(new Date().getTime() - days * 86400000));
}
function monthsAgoFirstDayISO(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

type Preset = "1m" | "3m" | "6m" | "12m";

export default function CustomersOverview() {
  const [preset, setPreset] = useState<Preset | null>(null);
  const [start, setStart] = useState<string>(() => daysAgoISO(30));
  const [end, setEnd] = useState<string>(() => dateOnlyToday());

  const [data, setData] = useState<CustomersMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => ({ start, end }), [start, end]);

  function applyPreset(p: Preset) {
    setPreset(p);
    const months = p === "1m" ? 1 : p === "3m" ? 3 : p === "6m" ? 6 : 12;
    setStart(monthsAgoFirstDayISO(months));
    setEnd(dateOnlyToday());
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await getCustomersMetrics(range);
        if (!alive) return;
        setData(res);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load customers metrics");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const all = data?.all_time;
  const inr = data?.in_range;

  const leadConversionsRange = Number(inr?.lead_conversions_in_range ?? 0);
  const leadConversionRate = Number(inr?.lead_conversion_rate_percent ?? 0);
  const leadConversionsAll = Number(all?.lead_conversions_all_time ?? 0);

  const convRateColor = leadConversionRate >= 30
    ? "rgb(16,185,129)"
    : leadConversionRate >= 10
    ? "rgb(234,179,8)"
    : "rgb(var(--fg))";

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Customers</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            New customers, lead conversions, and all-time mix (default: last 30 days)
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {(["1m", "3m", "6m", "12m"] as Preset[]).map((p) => (
            <PresetBtn key={p} label={p.toUpperCase()} active={preset === p} onClick={() => applyPreset(p)} />
          ))}
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Start</div>
            <input type="date" value={start} onChange={(e) => { setPreset(null); setStart(e.target.value); }}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }} />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>End (exclusive)</div>
            <input type="date" value={end} onChange={(e) => { setPreset(null); setEnd(e.target.value); }}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }} />
          </div>
          <button type="button" onClick={() => { setPreset(null); setStart(daysAgoISO(30)); setEnd(dateOnlyToday()); }}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}>
            Reset 30d
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
          Loading customer metrics…
        </div>
      ) : all && inr ? (
        <>
          {/* New customers in range */}
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard title="New customers (range)" value={fmt(inr.new_customers_in_range)} />
            <KpiCard title="Residential (range)" value={fmt(inr.new_residential_in_range)} valueColor="rgb(16,185,129)" />
            <KpiCard title="Business (range)" value={fmt(inr.new_business_in_range)} valueColor="rgb(99,102,241)" />
            <KpiCard title="Unknown (range)" value={fmt(inr.new_unknown_in_range)} />
          </div>

          {/* Lead conversion */}
          <div className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Lead Conversions</div>
                <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                  Leads promoted to full customers
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: convRateColor }}>{fmtPct(leadConversionRate)}</div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>conversion rate</div>
              </div>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(var(--fg), 0.08)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, leadConversionRate)}%`, background: convRateColor }} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>Conversions in range</div>
                <div className="text-lg font-semibold">{fmt(leadConversionsRange)}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>All-time conversions</div>
                <div className="text-lg font-semibold">{fmt(leadConversionsAll)}</div>
              </div>
            </div>
          </div>

          {/* All-time totals */}
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard title="Total customers (all-time)" value={fmt(all.customers_all_time)} />
            <KpiCard title="Residential (all-time)" value={`${fmt(all.residential_all_time)} (${all.residential_percent}%)`} valueColor="rgb(16,185,129)" />
            <KpiCard title="Business (all-time)" value={`${fmt(all.business_all_time)} (${all.business_percent}%)`} valueColor="rgb(99,102,241)" />
            <KpiCard title="Unknown (all-time)" value={fmt(all.unknown_all_time)} />
          </div>

          {/* Customer mix chart */}
          <div className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <div className="text-sm font-semibold">Customer mix (all-time)</div>
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Residential: {all.residential_percent}% · Business: {all.business_percent}% · Unknown:{" "}
              {Math.max(0, 100 - all.residential_percent - all.business_percent)}%
            </div>
            <CustomerMixCard
              residentialPercent={Number(all.residential_percent ?? 0)}
              businessPercent={Number(all.business_percent ?? 0)}
              unknownPercent={Math.max(0, 100 - Number(all.residential_percent ?? 0) - Number(all.business_percent ?? 0))}
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No customer data yet.
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
