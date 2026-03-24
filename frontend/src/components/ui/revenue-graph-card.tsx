// frontend/src/components/ui/revenue-graph-card.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "./card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RevenueGraphMode = "daily" | "weekly" | "monthly";

export type RevenueDailyRow = { day: string; completed_count: number; revenue_cents: number };
export type RevenueWeeklyRow = { week_start: string; completed_count: number; revenue_cents: number };
export type RevenueMonthlyRow = { month_start: string; completed_count: number; revenue_cents: number };

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

function fmtNum(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function fmtMoneyFromCents(cents: number) {
  const n = Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactMoneyFromCents(cents: number) {
  const dollars = cents / 100;
  if (!Number.isFinite(dollars)) return "$0";
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
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

export function RevenueGraphCard({
  mode,
  daily,
  weekly,
  monthly,
  title,
}: {
  mode: RevenueGraphMode;
  daily: RevenueDailyRow[];
  weekly: RevenueWeeklyRow[];
  monthly: RevenueMonthlyRow[];
  title?: string;
}) {
  const color = "hsl(var(--foreground))";

  const data = useMemo(() => {
    if (mode === "daily") {
      return (daily ?? []).map((r) => ({
        name: dayLabel(String(r.day ?? "")),
        revenueCents: num(r.revenue_cents),
        completed: num(r.completed_count),
      }));
    }
    if (mode === "weekly") {
      return (weekly ?? []).map((r) => ({
        name: weekLabel(String(r.week_start ?? "")),
        revenueCents: num(r.revenue_cents),
        completed: num(r.completed_count),
      }));
    }
    return (monthly ?? []).map((r) => ({
      name: monthLabel(String(r.month_start ?? "")),
      revenueCents: num(r.revenue_cents),
      completed: num(r.completed_count),
    }));
  }, [mode, daily, weekly, monthly]);

  const maxRevenueCents = useMemo(() => {
    const m = data.reduce((acc, r) => Math.max(acc, Number(r.revenueCents || 0)), 0);
    return Math.max(1, m);
  }, [data]);

  const sumRevenue = useMemo(() => data.reduce((a, r) => a + num(r.revenueCents), 0), [data]);
  const sumCompleted = useMemo(() => data.reduce((a, r) => a + num(r.completed), 0), [data]);

  const resolvedTitle =
    title ??
    (mode === "daily"
      ? "Daily revenue (within range)"
      : mode === "weekly"
      ? "Weekly revenue (within range)"
      : "Monthly revenue (within range)");

  return (
    <Card className="rounded-2xl border" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{resolvedTitle}</div>
            <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
              Hover bars for details • Completed shown in tooltip
            </div>
          </div>

          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Max: {fmtMoneyFromCents(maxRevenueCents)}
          </div>
        </div>

        {data.length === 0 ? (
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            No revenue data yet.
          </div>
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
                  tickFormatter={(v: number) => compactMoneyFromCents(Number(v))}
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
                  formatter={(v, name, item) => {
                    if (name === "revenueCents") {
                      const dollars = fmtMoneyFromCents(num(v));
                      const completed = (item as { payload?: { completed?: number } })?.payload?.completed ?? 0;
                      return [dollars, `Revenue • Completed: ${fmtNum(num(completed))}`] as [string, string];
                    }
                    return [String(v), String(name)] as [string, string];
                  }}
                />
                <Bar dataKey="revenueCents" fill={color} radius={[8, 8, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          <MiniStat label="Buckets" value={data.length} />
          <MiniStat label="Revenue (sum)" value={fmtMoneyFromCents(sumRevenue)} />
          <MiniStat label="Completed (sum)" value={fmtNum(sumCompleted)} />
        </div>
      </CardContent>
    </Card>
  );
}