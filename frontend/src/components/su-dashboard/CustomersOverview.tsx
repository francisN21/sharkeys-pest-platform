"use client";

import { useEffect, useMemo, useState } from "react";
import { getCustomersMetrics, type CustomersMetricsResponse } from "../../lib/api/adminMetrics";

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function fmtPct(n: number) {
  return Number.isFinite(n) ? `${n}%` : "0%";
}

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgoISO(days: number) {
  const now = new Date();
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CustomersOverview() {
  const [start, setStart] = useState<string>(() => daysAgoISO(30));
  const [end, setEnd] = useState<string>(() => todayISO()); // exclusive end in API

  const [data, setData] = useState<CustomersMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => ({ start, end }), [start, end]);

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

    return () => {
      alive = false;
    };
  }, [range]);

  const all = data?.all_time;
  const inr = data?.in_range;

  // ✅ NEW fields (safe defaults)
  const leadConversionsRange = Number(inr?.lead_conversions_in_range || 0);
  const leadConversionRate = Number(inr?.lead_conversion_rate_percent || 0);
  const leadConversionsAll = Number(all?.lead_conversions_all_time || 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Customers</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Day-level range (default: last 30 days)
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
              Start
            </div>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
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
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              title="End date is exclusive: data is counted before this day"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setStart(daysAgoISO(30));
              setEnd(todayISO());
            }}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            title="Reset to last 30 days"
          >
            Reset 30d
          </button>
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
          Loading customer metrics…
        </div>
      ) : all && inr ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard title="New customers (range)" value={fmt(inr.new_customers_in_range)} />
            <KpiCard title="New residential (range)" value={fmt(inr.new_residential_in_range)} />
            <KpiCard title="New business (range)" value={fmt(inr.new_business_in_range)} />
            <KpiCard title="New unknown (range)" value={fmt(inr.new_unknown_in_range)} />
          </div>

          {/* ✅ NEW: conversions row */}
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard title="Lead conversions (range)" value={fmt(leadConversionsRange)} />
            <KpiCard title="Lead conversion rate (range)" value={fmtPct(leadConversionRate)} />
            <KpiCard title="Lead conversions (all-time)" value={fmt(leadConversionsAll)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard title="Total customers (all-time)" value={fmt(all.customers_all_time)} />
            <KpiCard
              title="Residential (all-time)"
              value={`${fmt(all.residential_all_time)} (${all.residential_percent}%)`}
            />
            <KpiCard
              title="Business (all-time)"
              value={`${fmt(all.business_all_time)} (${all.business_percent}%)`}
            />
            <KpiCard title="Unknown (all-time)" value={fmt(all.unknown_all_time)} />
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="text-sm font-semibold">Customer mix (all-time)</div>
            <div className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
              Residential: {all.residential_percent}% • Business: {all.business_percent}% • Unknown:{" "}
              {Math.max(0, 100 - all.residential_percent - all.business_percent)}%
            </div>

            {/* lightweight “bar” visualization */}
            <div
              className="mt-3 h-3 w-full rounded-full border overflow-hidden"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
            >
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, Math.max(0, all.residential_percent))}%`,
                  background: "rgb(var(--text))",
                  opacity: 0.18,
                }}
              />
            </div>
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