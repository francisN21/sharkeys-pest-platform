"use client";

import { useEffect, useState } from "react";
import { getTrafficMetrics, type TrafficMetricsResponse } from "../../lib/api/adminMetrics";

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

export default function TrafficOverview({ days = 30 }: { days?: number }) {
  const [data, setData] = useState<TrafficMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await getTrafficMetrics(days);
        if (!alive) return;
        setData(res);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load traffic metrics");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [days]);

  const totals = data?.totals;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Traffic</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Requests + unique IPs (rolling windows)
          </div>
        </div>
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Window: last {days} days
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading traffic metrics…
        </div>
      ) : totals ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard title="All-time clicks" value={fmt(totals.requests_all_time)} />
          <KpiCard title="Requests (24h)" value={fmt(totals.requests_1d)} />
          <KpiCard title="Requests (7d)" value={fmt(totals.requests_7d)} />
          <KpiCard title="Requests (30d)" value={fmt(totals.requests_30d)} />
          <KpiCard title="Unique IPs (24h)" value={fmt(totals.uniques_1d)} />
          <KpiCard title="Unique IPs (7d)" value={fmt(totals.uniques_7d)} />
          <KpiCard title="Unique IPs (30d)" value={fmt(totals.uniques_30d)} />
        </div>
      ) : (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No traffic data yet.
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