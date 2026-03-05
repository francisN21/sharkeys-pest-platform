// frontend/src/components/su-dashboard/RevenueOverview.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { CreditCard, CalendarDays, ArrowUpRight, RefreshCcw } from "lucide-react";

/** ---------------------------
 * Fetch helpers
 ---------------------------- */

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

function daysBetween(startYmd: string, endExclusiveYmd: string) {
  const s = new Date(`${startYmd}T00:00:00`);
  const e = new Date(`${endExclusiveYmd}T00:00:00`);
  const ms = e.getTime() - s.getTime();
  return ms > 0 ? Math.round(ms / (24 * 60 * 60 * 1000)) : 0;
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
 * API shapes (ACTUAL backend response)
 * Based on the payload you pasted:
 * totals: { completed_count, revenue_cents }
 * daily:  [{ day, completed_count, revenue_cents }]
 * weekly: [{ week_start, completed_count, revenue_cents }]
 * monthly:[{ month_start, completed_count, revenue_cents }]
 ---------------------------- */

type RevenueRange = {
  start: string;
  end_exclusive: string;
  tzOffsetMinutes: number;
  days?: number; // we compute if missing
};

type RevenueTotals = {
  completed_count: number;
  revenue_cents: number;
};

type DailyRow = { day: string; completed_count: number; revenue_cents: number };
type WeeklyRow = { week_start: string; completed_count: number; revenue_cents: number };
type MonthlyRow = { month_start: string; completed_count: number; revenue_cents: number };

type RevenueMetricsResponse = {
  ok: boolean;
  range: RevenueRange;
  totals: RevenueTotals;
  daily: DailyRow[];
  weekly: WeeklyRow[];
  monthly: MonthlyRow[];
};

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

function localTodayYmd() {
  // local YYYY-MM-DD
  return dateOnly(new Date());
}

function weekStartLocalMondayYmd(d: Date) {
  // Monday as week start (matches your backend date_trunc('week') if it uses Monday; Postgres does)
  const day = d.getDay(); // Sun=0..Sat=6
  const diff = (day + 6) % 7; // Mon->0, Tue->1, ..., Sun->6
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return dateOnly(start);
}

function monthStartLocalYmd(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  return dateOnly(start);
}

async function getRevenueMetrics(range: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range.start) params.set("start", range.start);
  if (range.end) params.set("end", range.end);

  // IMPORTANT: JS getTimezoneOffset() is minutes *behind* UTC (PST=480)
  // Your backend response shows tzOffsetMinutes: 480, so keep this as-is.
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

  function normalize(res: RevenueMetricsResponse): RevenueMetricsResponse {
    const start = String(res?.range?.start ?? "");
    const endEx = String(res?.range?.end_exclusive ?? "");

    return {
      ok: !!res.ok,
      range: {
        start,
        end_exclusive: endEx,
        tzOffsetMinutes: num(res?.range?.tzOffsetMinutes),
        days: daysBetween(start, endEx),
      },
      totals: {
        completed_count: num(res?.totals?.completed_count),
        revenue_cents: num(res?.totals?.revenue_cents),
      },
      daily: (res?.daily ?? []).map((r) => ({
        day: String((r as DailyRow)?.day ?? ""),
        completed_count: num((r as DailyRow)?.completed_count),
        revenue_cents: num((r as DailyRow)?.revenue_cents),
      })),
      weekly: (res?.weekly ?? []).map((r) => ({
        week_start: String((r as WeeklyRow)?.week_start ?? ""),
        completed_count: num((r as WeeklyRow)?.completed_count),
        revenue_cents: num((r as WeeklyRow)?.revenue_cents),
      })),
      monthly: (res?.monthly ?? []).map((r) => ({
        month_start: String((r as MonthlyRow)?.month_start ?? ""),
        completed_count: num((r as MonthlyRow)?.completed_count),
        revenue_cents: num((r as MonthlyRow)?.revenue_cents),
      })),
    };
  }

  async function reload() {
    try {
      setLoading(true);
      setErr(null);
      const res = await getRevenueMetrics(range);
      setData(normalize(res));
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
        setData(normalize(res));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end, showAdvanced, useRollingEnd, fromMonth, toMonth, advStart, advEnd]);

  const totals = data?.totals ?? null;

  // Series for chart area (normalize to a common shape with bucket_start)
  type SeriesPoint = { bucket_start: string; completed_count: number; revenue_cents: number };

  const series: SeriesPoint[] = useMemo(() => {
    if (!data) return [];
    if (mode === "daily") {
      return (data.daily ?? []).map((r) => ({
        bucket_start: r.day,
        completed_count: r.completed_count,
        revenue_cents: r.revenue_cents,
      }));
    }
    if (mode === "weekly") {
      return (data.weekly ?? []).map((r) => ({
        bucket_start: r.week_start,
        completed_count: r.completed_count,
        revenue_cents: r.revenue_cents,
      }));
    }
    return (data.monthly ?? []).map((r) => ({
      bucket_start: r.month_start,
      completed_count: r.completed_count,
      revenue_cents: r.revenue_cents,
    }));
  }, [data, mode]);

  const maxRevenue = useMemo(() => {
    return series.reduce((m, r) => Math.max(m, Number(r.revenue_cents || 0)), 0);
  }, [series]);

  // Headline cards should be truly "today / this week / this month" in local time
  const headline = useMemo(() => {
    if (!data) return { today: 0, week: 0, month: 0 };

    const todayKey = localTodayYmd();
    const weekKey = weekStartLocalMondayYmd(new Date());
    const monthKey = monthStartLocalYmd(new Date());

    const today = (data.daily ?? []).find((r) => r.day === todayKey)?.revenue_cents ?? 0;
    const week = (data.weekly ?? []).find((r) => r.week_start === weekKey)?.revenue_cents ?? 0;
    const month = (data.monthly ?? []).find((r) => r.month_start === monthKey)?.revenue_cents ?? 0;

    return { today, week, month };
  }, [data]);

  const avgPerCompleted = useMemo(() => {
    const rev = num(totals?.revenue_cents);
    const c = num(totals?.completed_count);
    return c > 0 ? Math.round(rev / c) : 0;
  }, [totals]);

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
          Showing: {data.range.start} → {data.range.end_exclusive} (exclusive) • {data.range.days ?? 0} days
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {/* Headline stats cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          title="Today"
          value={fmtMoneyFromCents(headline.today)}
          subtitle="Based on your timezone"
          icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="This Week"
          value={fmtMoneyFromCents(headline.week)}
          subtitle="Week starts Monday"
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
            <KpiCard title="Revenue (range)" value={fmtMoneyFromCents(num(totals.revenue_cents))} />
            <KpiCard title="Completed jobs (range)" value={fmtNum(num(totals.completed_count))} />
            <KpiCard title="Avg $ / completed" value={fmtMoneyFromCents(avgPerCompleted)} />
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
                {mode === "daily" ? "Daily revenue" : mode === "weekly" ? "Weekly revenue" : "Monthly revenue"} (within range)
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
                  const cents = num(r.revenue_cents);
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
                        Completed: {fmtNum(num(r.completed_count))}
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

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
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