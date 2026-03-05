// frontend/src/components/su-dashboard/RevenueOverview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { CreditCard, CalendarDays, ArrowUpRight, RefreshCcw } from "lucide-react";

type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    ...init,
    headers: { ...(init?.headers || {}), "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

/** ---------------------------
 * Date helpers (same semantics as BookingsOverview)
 ---------------------------- */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateOnly(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function dateOnlyToday() {
  return dateOnly(new Date());
}

function dateOnlyDaysAgo(days: number) {
  const now = new Date();
  return dateOnly(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));
}

function toMonthValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  return `${yyyy}-${mm}`; // <input type="month">
}

function dateOnlyFromMonthStart(monthValue: string) {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return null;
  return `${monthValue}-01`;
}

function dateOnlyEndExclusiveFromMonthEnd(monthValue: string) {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return null;
  const [y, m] = monthValue.split("-").map(Number);
  const firstOfNext = new Date(Date.UTC(y, m, 1));
  return dateOnly(firstOfNext);
}

function fmtMoneyFromCents(cents: number) {
  const n = Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function monthLabel(monthStartIso: string) {
  const d = new Date(monthStartIso);
  if (Number.isNaN(d.getTime())) return monthStartIso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function dayLabel(dayIso: string) {
  const d = new Date(dayIso);
  if (Number.isNaN(d.getTime())) return dayIso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekLabel(weekStartIso: string) {
  const d = new Date(weekStartIso);
  if (Number.isNaN(d.getTime())) return weekStartIso;
  const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
  const a = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const b = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${a}–${b}`;
}

/** ---------------------------
 * API types (expected shape)
 * You can adjust to match your backend response.
 ---------------------------- */

type RevenueTotals = {
  revenue_cents_in_range: number;
  completed_jobs_in_range: number;

  // optional: for headline quick glance
  revenue_cents_today?: number;
  revenue_cents_this_week?: number;
  revenue_cents_this_month?: number;

  // optional: comparison deltas
  pct_change_vs_prev_period?: number | null;
};

type RevenuePoint = {
  bucket_start: string; // ISO date (day/week/month start)
  revenue_cents: number;
  completed_jobs: number;
};

type RevenueMetricsResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string; days: number };
  totals: RevenueTotals;
  daily: RevenuePoint[];
  weekly: RevenuePoint[];
  monthly: RevenuePoint[];
};

async function getRevenueMetrics(range: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range.start) params.set("start", range.start);
  if (range.end) params.set("end", range.end);
  params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));
  return jsonFetch<RevenueMetricsResponse>(`/admin/revenue-metrics?${params.toString()}`, { method: "GET" });
}

/** ---------------------------
 * UI
 ---------------------------- */

type ViewMode = "daily" | "weekly" | "monthly";

export default function RevenueOverview() {
  // ✅ Default: rolling last 90 days to TODAY (exclusive end)
  const defaultStartMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return toMonthValue(start);
  }, []);
  const defaultEndMonth = useMemo(() => toMonthValue(new Date()), []);

  const [fromMonth, setFromMonth] = useState<string>(defaultStartMonth);
  const [toMonth, setToMonth] = useState<string>(defaultEndMonth);
  const [useRollingEnd, setUseRollingEnd] = useState<boolean>(true);

  // Advanced day-level range
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [advStart, setAdvStart] = useState<string>(() => dateOnlyDaysAgo(90));
  const [advEnd, setAdvEnd] = useState<string>(() => dateOnlyToday()); // exclusive end

  // View toggle (daily/weekly/monthly)
  const [mode, setMode] = useState<ViewMode>("monthly");

  const [data, setData] = useState<RevenueMetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function reset90d() {
    setFromMonth(defaultStartMonth);
    setToMonth(defaultEndMonth);
    setUseRollingEnd(true);
    setAdvStart(dateOnlyDaysAgo(90));
    setAdvEnd(dateOnlyToday());
  }

  // Build query range (same pattern as BookingsOverview)
  const range = useMemo(() => {
    if (showAdvanced) {
      return { start: advStart || undefined, end: advEnd || undefined };
    }

    const start = dateOnlyFromMonthStart(fromMonth) ?? undefined;
    const end = useRollingEnd ? dateOnlyToday() : (dateOnlyEndExclusiveFromMonthEnd(toMonth) ?? undefined);
    return { start, end };
  }, [showAdvanced, advStart, advEnd, fromMonth, toMonth, useRollingEnd]);

  async function reload() {
    try {
      setLoading(true);
      setErr(null);
      const res = await getRevenueMetrics(range);
      setData(res);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load revenue metrics");
      setData(null);
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
        const res = await getRevenueMetrics(range);
        if (!alive) return;
        setData(res);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load revenue metrics");
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [range]);

  const totals = data?.totals ?? null;

  const series = useMemo(() => {
    if (!data) return [];
    if (mode === "daily") return data.daily ?? [];
    if (mode === "weekly") return data.weekly ?? [];
    return data.monthly ?? [];
  }, [data, mode]);

  const maxRevenue = useMemo(() => {
    return series.reduce((m, r) => Math.max(m, Number(r.revenue_cents || 0)), 0);
  }, [series]);

  // Headline cards: prefer backend-provided today/week/month; otherwise derive rough values from buckets (best effort)
  const headline = useMemo(() => {
    if (!data?.totals) {
      return { today: 0, week: 0, month: 0, pct: null as number | null };
    }

    const t = data.totals;
    const pct = typeof t.pct_change_vs_prev_period === "number" ? t.pct_change_vs_prev_period : null;

    // If backend gives explicit totals, use them.
    if (
      typeof t.revenue_cents_today === "number" ||
      typeof t.revenue_cents_this_week === "number" ||
      typeof t.revenue_cents_this_month === "number"
    ) {
      return {
        today: Number(t.revenue_cents_today ?? 0),
        week: Number(t.revenue_cents_this_week ?? 0),
        month: Number(t.revenue_cents_this_month ?? 0),
        pct,
      };
    }

    // Fallback: use the latest bucket of each series
    const today = (data.daily?.[data.daily.length - 1]?.revenue_cents ?? 0) || 0;
    const week = (data.weekly?.[data.weekly.length - 1]?.revenue_cents ?? 0) || 0;
    const month = (data.monthly?.[data.monthly.length - 1]?.revenue_cents ?? 0) || 0;

    return { today, week, month, pct };
  }, [data]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Revenue</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Daily / weekly / monthly revenue rollups (default: last 90 days)
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={reset90d}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            title="Reset to last 90 days (rolling to today)"
          >
            Reset 90d
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            title="Advanced date range"
          >
            {showAdvanced ? "Hide advanced" : "Advanced"}
          </button>

          <button
            type="button"
            onClick={reload}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={loading}
            title="Refresh"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </span>
          </button>
        </div>
      </div>

      {/* Month range controls */}
      {!showAdvanced ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Tip: Month range for quick rollups. Use Advanced for exact day-level ranges.
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                From
              </div>
              <input
                type="month"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                To
              </div>
              <input
                type="month"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                disabled={useRollingEnd}
                title={useRollingEnd ? "Disabled because Rolling end is ON" : "Select end month"}
              />
            </div>

            <label
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            >
              <input type="checkbox" checked={useRollingEnd} onChange={(e) => setUseRollingEnd(e.target.checked)} />
              Rolling end (today)
            </label>
          </div>
        </div>
      ) : (
        // Advanced day-level controls
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Advanced</div>
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Pick exact start/end (end is exclusive).
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  Start
                </div>
                <input
                  type="date"
                  value={advStart}
                  onChange={(e) => setAdvStart(e.target.value)}
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
                  value={advEnd}
                  onChange={(e) => setAdvEnd(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Range caption */}
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

      {/* Headline stats cards (shadcn look) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          title="Today"
          value={fmtMoneyFromCents(headline.today)}
          subtitle={headline.pct === null ? "—" : `${headline.pct > 0 ? "+" : ""}${headline.pct.toFixed(1)}% vs prev period`}
          icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="This Week"
          value={fmtMoneyFromCents(headline.week)}
          subtitle="Rolling based on your timezone"
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="This Month"
          value={fmtMoneyFromCents(headline.month)}
          subtitle="Monthly rollup"
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* KPIs within selected range */}
      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading revenue metrics…
        </div>
      ) : totals ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard title="Revenue (range)" value={fmtMoneyFromCents(totals.revenue_cents_in_range)} />
            <KpiCard title="Completed jobs (range)" value={fmtNum(totals.completed_jobs_in_range)} />
            <KpiCard
              title="Avg $ / completed"
              value={
                totals.completed_jobs_in_range > 0
                  ? fmtMoneyFromCents(Math.round(totals.revenue_cents_in_range / totals.completed_jobs_in_range))
                  : "$0.00"
              }
            />
          </div>

          {/* Mode toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <ModeButton active={mode === "daily"} onClick={() => setMode("daily")} label="Daily" />
            <ModeButton active={mode === "weekly"} onClick={() => setMode("weekly")} label="Weekly" />
            <ModeButton active={mode === "monthly"} onClick={() => setMode("monthly")} label="Monthly" />
          </div>

          {/* Series card */}
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">
                {mode === "daily" ? "Daily revenue" : mode === "weekly" ? "Weekly revenue" : "Monthly revenue"} (within
                range)
              </div>

              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Bars scaled to max in view
              </div>
            </div>

            {series.length === 0 ? (
              <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                No revenue data yet.
              </div>
            ) : (
              <div className="space-y-2">
                {series.map((r) => {
                  const cents = Number(r.revenue_cents || 0);
                  const pct = maxRevenue > 0 ? Math.round((cents / maxRevenue) * 100) : 0;

                  const leftLabel =
                    mode === "monthly" ? monthLabel(r.bucket_start) : mode === "weekly" ? weekLabel(r.bucket_start) : dayLabel(r.bucket_start);

                  return (
                    <div key={`${mode}-${r.bucket_start}`} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-4 text-sm" style={{ color: "rgb(var(--muted))" }}>
                        {leftLabel}
                      </div>

                      <div className="col-span-6">
                        <div
                          className="h-3 rounded-full border overflow-hidden"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${pct}%`,
                              background: "rgb(var(--text))",
                              opacity: 0.15,
                            }}
                          />
                        </div>
                      </div>

                      <div className="col-span-2 text-right text-sm font-semibold">{fmtMoneyFromCents(cents)}</div>

                      <div className="col-span-12 -mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Completed: {fmtNum(Number(r.completed_jobs || 0))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No revenue data yet.
        </div>
      )}
    </section>
  );
}

/** ---------------------------
 * Small UI components
 ---------------------------- */

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

function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center pt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
          <ArrowUpRight className="mr-1 h-3 w-3" />
          <span>{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
      style={{
        borderColor: "rgb(var(--border))",
        background: active ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)",
      }}
      title={label}
    >
      {label}
    </button>
  );
}