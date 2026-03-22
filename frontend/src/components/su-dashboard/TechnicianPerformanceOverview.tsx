// frontend/src/components/su-dashboard/TechnicianPerformanceOverview.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import {
  getTechnicianPerformance,
  exportTechnicianPerformanceCsv,
  type TechnicianPerformanceRow,
} from "../../lib/api/adminMetrics";

/** ---------------------------
 * Date helpers
 ---------------------------- */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateOnly(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateOnlyToday() {
  return dateOnly(new Date());
}

function monthsAgoFirstDay(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  return dateOnly(d);
}

/** ---------------------------
 * Format helpers
 ---------------------------- */

function fmtMoney(cents: number) {
  const n = Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

function fmtHours(h: number | null | undefined) {
  if (h == null || !Number.isFinite(Number(h))) return "—";
  const hours = Number(h);
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

/** ---------------------------
 * Preset helpers
 ---------------------------- */

type Preset = "1m" | "3m" | "6m" | "12m";

function presetRange(preset: Preset): { start: string; end: string } {
  const months = preset === "1m" ? 1 : preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
  return { start: monthsAgoFirstDay(months), end: dateOnlyToday() };
}

/** ---------------------------
 * Component
 ---------------------------- */

export default function TechnicianPerformanceOverview() {
  const [preset, setPreset] = useState<Preset>("6m");
  const [exporting, setExporting] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianPerformanceRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => presetRange(preset), [preset]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const res = await getTechnicianPerformance(range);
      setTechnicians(
        (res.technicians ?? []).map((r) => ({
          ...r,
          total_assigned: num(r.total_assigned),
          completed_count: num(r.completed_count),
          cancelled_count: num(r.cancelled_count),
          active_count: num(r.active_count),
          revenue_cents: num(r.revenue_cents),
          avg_completion_hours: r.avg_completion_hours != null ? num(r.avg_completion_hours) : null,
        }))
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load technician performance");
      setTechnicians([]);
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
        const res = await getTechnicianPerformance(range);
        if (!alive) return;
        setTechnicians(
          (res.technicians ?? []).map((r) => ({
            ...r,
            total_assigned: num(r.total_assigned),
            completed_count: num(r.completed_count),
            cancelled_count: num(r.cancelled_count),
            active_count: num(r.active_count),
            revenue_cents: num(r.revenue_cents),
            avg_completion_hours: r.avg_completion_hours != null ? num(r.avg_completion_hours) : null,
          }))
        );
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load technician performance");
        setTechnicians([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [range]);

  const topByRevenue = useMemo(
    () => [...technicians].sort((a, b) => b.revenue_cents - a.revenue_cents),
    [technicians]
  );

  async function onExportCsv() {
    try {
      setExporting(true);
      const res = await exportTechnicianPerformanceCsv(range);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `technician_performance_${range.start}_to_${range.end}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Technician Performance</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Per-technician KPIs for assigned bookings in range
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {(["1m", "3m", "6m", "12m"] as Preset[]).map((p) => (
            <PresetButton key={p} label={p.toUpperCase()} active={preset === p} onClick={() => setPreset(p)} />
          ))}

          <button
            type="button"
            onClick={onExportCsv}
            disabled={exporting || loading}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              {loading ? "Refreshing…" : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
        Showing: {range.start} → {range.end} (exclusive) — bookings assigned in this period
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading technician performance…
        </div>
      ) : topByRevenue.length === 0 ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No technician data in this range.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgb(var(--card))" }}>
                {["Technician", "Completed", "Active", "Cancelled", "Revenue", "Avg Time"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topByRevenue.map((tech, i) => (
                <tr
                  key={tech.worker_id}
                  style={{
                    background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)",
                    borderTop: "1px solid rgb(var(--border))",
                  }}
                >
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {tech.first_name} {tech.last_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <CompletionBadge count={tech.completed_count} total={tech.total_assigned} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtNum(tech.active_count)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {tech.cancelled_count > 0 ? (
                      <span style={{ color: "rgb(239 68 68)" }}>{fmtNum(tech.cancelled_count)}</span>
                    ) : (
                      <span style={{ color: "rgb(var(--muted))" }}>0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">
                    {fmtMoney(tech.revenue_cents)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>
                    {fmtHours(tech.avg_completion_hours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CompletionBadge({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <span>
      {count}
      <span className="ml-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
        ({pct}%)
      </span>
    </span>
  );
}

function PresetButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
      style={{
        borderColor: "rgb(var(--border))",
        background: active ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)",
        fontWeight: active ? 700 : 600,
      }}
    >
      {label}
    </button>
  );
}
