"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "./card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = {
  month_start: string;
  created_count?: number | null;
  completed_count?: number | null;
  cancelled_count?: number | null;
};

function monthLabel(monthStartIso: string) {
  const d = new Date(monthStartIso);
  if (Number.isNaN(d.getTime())) return monthStartIso;
  return d.toLocaleDateString(undefined, { year: "2-digit", month: "short" });
}

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function MonthlyBookingsCard({
  title = "Monthly bookings (within range)",
  series,
}: {
  title?: string;
  series: Row[];
}) {
  const data = useMemo(
    () =>
      (series ?? []).map((r) => ({
        month: monthLabel(r.month_start),
        created: toNum(r.created_count),
        completed: toNum(r.completed_count),
        cancelled: toNum(r.cancelled_count),
      })),
    [series]
  );

  const color = "hsl(var(--foreground))";

  const maxY = useMemo(() => {
    const m = data.reduce((acc, r) => Math.max(acc, r.created), 0);
    return Math.max(1, m);
  }, [data]);

  return (
    <Card
      className="rounded-2xl border"
      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
    >
      <CardContent className="p-5 space-y-3">
        <div className="text-sm font-semibold">{title}</div>

        {data.length === 0 ? (
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            No data yet.
          </div>
        ) : (
          <>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 12, fill: "rgb(var(--muted))" }}
                  />
                  <YAxis
                    domain={[0, maxY]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "rgb(var(--muted))" }}
                    width={32}
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
                    formatter={(v, name) => {
                      const label =
                        name === "created" ? "Created" : name === "completed" ? "Completed" : "Cancelled";
                      return [String(v), label] as [string, string];
                    }}
                  />
                  {/* Modern + clean: show Created as the main bar */}
                  <Bar dataKey="created" fill={color} radius={[8, 8, 0, 0]} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick breakdown row so you still see completed/cancelled at a glance */}
            <div className="grid gap-2 sm:grid-cols-3">
              <MiniStat label="Created (sum)" value={data.reduce((a, r) => a + r.created, 0)} />
              <MiniStat label="Completed (sum)" value={data.reduce((a, r) => a + r.completed, 0)} />
              <MiniStat label="Cancelled (sum)" value={data.reduce((a, r) => a + r.cancelled, 0)} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border px-3 py-2" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {label}
      </div>
      <div className="text-sm font-semibold">{Number.isFinite(value) ? value.toLocaleString() : "0"}</div>
    </div>
  );
}