// frontend/src/components/su-dashboard/RevenueOverview.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { CreditCard, CalendarDays, ArrowUpRight, RefreshCcw } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
 * Date helpers
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
 * API shapes
 ---------------------------- */

type RevenueRange = {
  start: string;
  end_exclusive: string;
  tzOffsetMinutes: number;
  days?: number;
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
  return dateOnly(new Date());
}

function weekStartLocalMondayYmd(d: Date) {
  const day = d.getDay(); // Sun=0..Sat=6
  const diff = (day + 6) % 7; // Mon->0 .. Sun->6
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

  // JS getTimezoneOffset() is minutes *behind* UTC (PST=480)
  params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));

  return jsonFetch<RevenueMetricsResponse>(`/admin/revenue-metrics?${params.toString()}`, { method: "GET" });
}

/** ---------------------------
 * UI
 ---------------------------- */

type ViewMode = "daily" | "weekly" | "monthly";

type SeriesPoint = {
  bucket_start: string;
  label: string;
  revenue_cents: number;
  completed_count: number;
};

function compactMoneyFromCents(cents: number) {
  const dollars = cents / 100;
  if (!Number.isFinite(dollars)) return "$0";
  // compact like $1.2K / $3.4M where appropriate
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

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

  // Build query range
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
  }, [range]);

  const totals = data?.totals ?? null;

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

  const series: SeriesPoint[] = useMemo(() => {
    if (!data) return [];

    if (mode === "daily") {
      return (data.daily ?? []).map((r) => ({
        bucket_start: r.day,
        label: dayLabel(r.day),
        revenue_cents: num(r.revenue_cents),
        completed_count: num(r.completed_count),
      }));
    }

    if (mode === "weekly") {
      return (data.weekly ?? []).map((r) => ({
        bucket_start: r.week_start,
        label: weekLabel(r.week_start),
        revenue_cents: num(r.revenue_cents),
        completed_count: num(r.completed_count),
      }));
    }

    return (data.monthly ?? []).map((r) => ({
      bucket_start: r.month_start,
      label: monthLabel(r.month_start),
      revenue_cents: num(r.revenue_cents),
      completed_count: num(r.completed_count),
    }));
  }, [data, mode]);

  const chartData = useMemo(
    () =>
      series.map((p) => ({
        name: p.label,
        revenueCents: p.revenue_cents,
        completed: p.completed_count,
      })),
    [series]
  );

  const maxRevenueCents = useMemo(() => {
    const m = chartData.reduce((acc, r) => Math.max(acc, Number(r.revenueCents || 0)), 0);
    return Math.max(1, m);
  }, [chartData]);

  const color = "hsl(var(--foreground))";

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
              {loading ? "Refreshing…" : "Refresh"}
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

      {/* Headline cards */}
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

          {/* Keep your daily/weekly/monthly buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <ModeButton active={mode === "daily"} onClick={() => setMode("daily")} label="Daily" />
            <ModeButton active={mode === "weekly"} onClick={() => setMode("weekly")} label="Weekly" />
            <ModeButton active={mode === "monthly"} onClick={() => setMode("monthly")} label="Monthly" />
          </div>

          {/* ✅ Modern graph replacement */}
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  {mode === "daily" ? "Daily revenue" : mode === "weekly" ? "Weekly revenue" : "Monthly revenue"} (within
                  range)
                </div>
                <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Hover bars for details • Completed shown in tooltip
                </div>
              </div>

              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Max: {fmtMoneyFromCents(maxRevenueCents)}
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                No revenue data yet.
              </div>
            ) : (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      tick={{ fontSize: 12, fill: "rgb(var(--muted))" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "rgb(var(--muted))" }}
                      width={40}
                      domain={[0, maxRevenueCents]}
                      tickFormatter={(v) => compactMoneyFromCents(Number(v))}
                    />
                    <Tooltip
                      cursor={{ opacity: 0.08 }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgb(var(--border))",
                        background: "rgb(var(--card))",
                        color: "rgb(var(--fg))",
                      }}
                      labelStyle={{ color: "rgb(var(--muted))" }}
                      formatter={(v: unknown, name: string, item: any) => {
                        if (name === "revenueCents") {
                          const dollars = fmtMoneyFromCents(num(v));
                          const completed = item?.payload?.completed ?? 0;
                          return [dollars, `Revenue • Completed: ${fmtNum(num(completed))}`];
                        }
                        return [String(v), name];
                      }}
                    />
                    <Bar dataKey="revenueCents" fill={color} radius={[8, 8, 0, 0]} isAnimationActive />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Small summary row to match your KPI style */}
            <div className="grid gap-2 sm:grid-cols-3">
              <MiniStat label="Buckets" value={chartData.length} />
              <MiniStat
                label="Revenue (sum)"
                value={fmtMoneyFromCents(chartData.reduce((a, r) => a + num(r.revenueCents), 0))}
              />
              <MiniStat
                label="Completed (sum)"
                value={fmtNum(chartData.reduce((a, r) => a + num(r.completed), 0))}
              />
            </div>
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border px-3 py-2" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {label}
      </div>
      <div className="text-sm font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}