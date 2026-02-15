"use client";

import { useEffect, useMemo, useState } from "react";
import { getSurveyMetrics, type SurveyMetricsResponse } from "../../lib/api/adminMetrics";

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

function fmt(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

export default function SurveyOverview() {
  // ✅ Default: last 30 days
  const [start, setStart] = useState<string>(() => daysAgoISO(30));
  const [end, setEnd] = useState<string>(() => todayISO()); // exclusive end in API

  const [data, setData] = useState<SurveyMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => ({ start, end }), [start, end]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await getSurveyMetrics(range);
        if (!alive) return;
        setData(res);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load survey metrics");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [range]);

  const total = data?.total_responses ?? 0;
  const counts = useMemo(() => data?.counts ?? [], [data?.counts]);
  const topOther = data?.top_other ?? [];

  // Build pie segments (CSS conic-gradient)
  // We don’t hardcode colors; we use subtle opacity steps of current text color.
  const pieStyle = useMemo(() => {
    if (!total || counts.length === 0) return undefined;

    let acc = 0;
    // Use varying alpha to visually separate slices with same base color
    const stops = counts
      .filter((c) => c.count > 0)
      .map((c, i) => {
        const pct = (c.count / total) * 100;
        const startPct = acc;
        const endPct = acc + pct;
        acc = endPct;

        const alpha = 0.12 + (i % 6) * 0.06; // 0.12..0.42 repeating
        return `rgba(var(--text), ${alpha}) ${startPct.toFixed(2)}% ${endPct.toFixed(2)}%`;
      });

    if (stops.length === 0) return undefined;

    return {
      background: `conic-gradient(${stops.join(", ")})`,
    } as const;
  }, [counts, total]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Survey sources</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Where customers heard about you (default: last 30 days)
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
              title="End date is exclusive: responses before this day"
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
          Showing: {data.range.start} → {data.range.end_exclusive} (exclusive) • {data.range.days} days • Total responses:{" "}
          {fmt(total)}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading survey metrics…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pie */}
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Distribution</div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Pie chart of survey selections
                </div>
              </div>
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Responses: {fmt(total)}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-5">
              <div
                className="h-40 w-40 rounded-full border"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(var(--bg), 0.25)",
                  ...(pieStyle ?? {}),
                }}
                title={total ? "Survey distribution" : "No survey responses yet"}
              />
              <div className="flex-1 space-y-2">
                {counts.map((c, i) => {
                  const pct = total > 0 ? Math.round((c.count / total) * 1000) / 10 : 0;
                  const alpha = 0.12 + (i % 6) * 0.06;
                  return (
                    <div key={c.code} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block h-3 w-3 rounded-sm border"
                          style={{
                            borderColor: "rgb(var(--border))",
                            background: `rgba(var(--text), ${alpha})`,
                          }}
                        />
                        <span className="truncate">{c.label}</span>
                      </div>
                      <div className="shrink-0" style={{ color: "rgb(var(--muted))" }}>
                        {fmt(c.count)} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Other */}
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="text-sm font-semibold">Top “Other” answers</div>
            <div className="text-xs mt-1" style={{ color: "rgb(var(--muted))" }}>
              Top 3 typed responses (normalized). Use this later to decide what to promote into the main list.
            </div>

            <div className="mt-4 space-y-2">
              {topOther.length === 0 ? (
                <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                  No “Other” answers yet for this range.
                </div>
              ) : (
                topOther.map((o) => (
                  <div
                    key={o.val}
                    className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                  >
                    <div className="text-sm truncate">{o.val}</div>
                    <div className="text-sm font-semibold">{fmt(o.count)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 text-xs" style={{ color: "rgb(var(--muted))" }}>
              Note: “Referred” names are intentionally not shown here (we’ll handle referral attribution later).
            </div>
          </div>
        </div>
      )}
    </section>
  );
}