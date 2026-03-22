"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { getTrafficMetrics, type TrafficMetricsResponse } from "../../lib/api/adminMetrics";

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function pct(part: number, total: number) {
  if (!total || !Number.isFinite(part) || !Number.isFinite(total)) return 0;
  return Math.min(100, (part / total) * 100);
}

export default function TrafficOverview({ days = 30 }: { days?: number }) {
  const [data, setData] = useState<TrafficMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const res = await getTrafficMetrics(days);
      setData(res);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load traffic metrics");
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
    return () => { alive = false; };
  }, [days]);

  const t = data?.totals;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Traffic Overview</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Requests and unique IPs across rolling time windows
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60 self-start sm:self-auto"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            {loading ? "Refreshing…" : "Refresh"}
          </span>
        </button>
      </div>

      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>{err}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading traffic metrics…
        </div>
      ) : t ? (
        <>
          {/* All-time highlight */}
          <div className="rounded-2xl border p-5 flex items-center justify-between"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted))" }}>
                All-time requests
              </div>
              <div className="mt-1 text-3xl font-bold">{fmt(t.requests_all_time)}</div>
            </div>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <i className="fa-solid fa-chart-bar" style={{ color: "rgb(59,130,246)", fontSize: "18px" }} />
            </div>
          </div>

          {/* Rolling windows */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Requests */}
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgb(59,130,246)" }} />
                <div className="text-sm font-semibold">Page Requests</div>
              </div>
              <div className="space-y-3">
                {([
                  { label: "Last 24 h", value: t.requests_1d, base: t.requests_30d },
                  { label: "Last 7 days", value: t.requests_7d, base: t.requests_30d },
                  { label: "Last 30 days", value: t.requests_30d, base: t.requests_30d },
                ] as const).map(({ label, value, base }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: "rgb(var(--muted))" }}>{label}</span>
                      <span className="font-semibold">{fmt(value)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(var(--fg), 0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct(value, base)}%`, background: "rgb(59,130,246)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unique IPs */}
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgb(16,185,129)" }} />
                <div className="text-sm font-semibold">Unique Visitors</div>
              </div>
              <div className="space-y-3">
                {([
                  { label: "Last 24 h", value: t.uniques_1d, base: t.uniques_30d },
                  { label: "Last 7 days", value: t.uniques_7d, base: t.uniques_30d },
                  { label: "Last 30 days", value: t.uniques_30d, base: t.uniques_30d },
                ] as const).map(({ label, value, base }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: "rgb(var(--muted))" }}>{label}</span>
                      <span className="font-semibold">{fmt(value)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(var(--fg), 0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct(value, base)}%`, background: "rgb(16,185,129)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No traffic data yet.
        </div>
      )}
    </section>
  );
}
