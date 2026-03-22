"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { RangeDropdown, type RangePreset } from "./RangeDropdown";
import { getSurveyMetrics, type SurveyMetricsResponse } from "../../lib/api/adminMetrics";
import SurveyReferrals from "./SurveyReferrals";

function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateOnly(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function tomorrowISO() { return dateOnly(new Date(new Date().getTime() + 86400000)); }
function daysAgoISO(days: number) { return dateOnly(new Date(new Date().getTime() - days * 86400000)); }
function monthsAgoFirstDayISO(months: number) {
  const d = new Date(); d.setMonth(d.getMonth() - months); d.setDate(1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}
function fmt(n: number) { return Number.isFinite(n) ? n.toLocaleString() : "0"; }

const SOURCE_COLORS: Record<string, string> = {
  google:    "rgb(66,133,244)",
  instagram: "rgb(225,48,108)",
  facebook:  "rgb(24,119,242)",
  linkedin:  "rgb(0,119,181)",
  referred:  "rgb(16,185,129)",
  other:     "rgb(156,163,175)",
};
function sourceColor(code: string) { return SOURCE_COLORS[code.toLowerCase()] ?? "rgb(156,163,175)"; }

function presetRange(p: RangePreset) {
  const months = p === "1m" ? 1 : p === "3m" ? 3 : p === "6m" ? 6 : 12;
  return { start: monthsAgoFirstDayISO(months), end: tomorrowISO() };
}

export default function SurveyOverview() {
  const [preset, setPreset] = useState<RangePreset | null>(null);
  const [customStart, setCustomStart] = useState(() => daysAgoISO(30));
  const [customEnd, setCustomEnd] = useState(() => tomorrowISO());

  const [data, setData] = useState<SurveyMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  function handlePreset(p: RangePreset) {
    setPreset(p);
    const r = presetRange(p);
    setCustomStart(r.start);
    setCustomEnd(r.end);
  }

  const range = useMemo(() => ({ start: customStart, end: customEnd }), [customStart, customEnd]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr(null);
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
    return () => { alive = false; };
  }, [range, refreshNonce]);

  const total = data?.total_responses ?? 0;
  const counts = useMemo(() => data?.counts ?? [], [data?.counts]);
  const topOther = data?.top_other ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-base font-semibold">Survey Sources</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Where customers heard about you (default: last 30 days)
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
            endLabel="End (exclusive)"
          />
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
          Showing: {data.range.start} → {data.range.end_exclusive} (exclusive) · {data.range.days} days · {fmt(total)} total responses
        </div>
      )}

      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>{err}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading survey metrics…
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Source distribution */}
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Source Distribution</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                    Where {fmt(total)} customers heard about you
                  </div>
                </div>
                <div className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(var(--fg), 0.08)", color: "rgb(var(--muted))" }}>
                  {fmt(total)} responses
                </div>
              </div>
              {total === 0 ? (
                <div className="text-sm py-4 text-center" style={{ color: "rgb(var(--muted))" }}>
                  No survey responses in this range.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {counts
                    .filter((c) => c.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .map((c) => {
                      const pct = total > 0 ? (c.count / total) * 100 : 0;
                      const color = sourceColor(c.code);
                      return (
                        <div key={c.code} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                              <span className="font-medium">{c.label}</span>
                            </div>
                            <span style={{ color: "rgb(var(--muted))" }}>{fmt(c.count)} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(var(--fg), 0.08)" }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Top "Other" answers */}
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div>
                <div className="text-sm font-semibold">Top "Other" Answers</div>
                <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                  Typed responses — use these to decide what to add to the main list
                </div>
              </div>
              {topOther.length === 0 ? (
                <div className="text-sm py-4 text-center" style={{ color: "rgb(var(--muted))" }}>
                  No "Other" answers yet for this range.
                </div>
              ) : (
                <div className="space-y-2">
                  {topOther.map((o, i) => (
                    <div key={o.val} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold flex-shrink-0"
                          style={{ background: "rgba(var(--fg), 0.07)", color: "rgb(var(--muted))" }}>
                          {i + 1}
                        </span>
                        <span className="text-sm truncate">{o.val}</span>
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0">{fmt(o.count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SurveyReferrals />
        </>
      )}
    </section>
  );
}
