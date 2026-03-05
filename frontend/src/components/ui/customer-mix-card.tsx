"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  residentialPercent: number;
  businessPercent: number;
  unknownPercent: number;
};

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function fmtPct(n: number) {
  const v = clampPct(n);
  return `${v}%`;
}

export function CustomerMixCard({ residentialPercent, businessPercent, unknownPercent }: Props) {
  const data = useMemo(
    () => [
      { key: "Residential", value: clampPct(residentialPercent) },
      { key: "Business", value: clampPct(businessPercent) },
      { key: "Unknown", value: clampPct(unknownPercent) },
    ],
    [residentialPercent, businessPercent, unknownPercent]
  );

  // Uses your theme foreground color so it matches light/dark automatically
  const color = "hsl(var(--foreground))";

  return (
    <Card className="rounded-2xl border" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Customer mix (all-time)</div>
            <div className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
              Residential: {fmtPct(residentialPercent)} • Business: {fmtPct(businessPercent)} • Unknown:{" "}
              {fmtPct(unknownPercent)}
            </div>
          </div>
        </div>

        <div className="mt-4 h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="key"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "rgb(var(--muted))" }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "rgb(var(--muted))" }}
                width={28}
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
                formatter={(v) => [`${v}%`, "Percent"]}
              />
              <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subtle footer hint for readability */}
        <div className="mt-3 text-xs" style={{ color: "rgb(var(--muted))" }}>
          Values are percentages (0–100).
        </div>
      </CardContent>
    </Card>
  );
}