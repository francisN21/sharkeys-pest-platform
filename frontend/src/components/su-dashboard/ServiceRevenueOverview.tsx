// frontend/src/components/su-dashboard/ServiceRevenueOverview.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Download } from "lucide-react";
import { RangeDropdown, type RangePreset } from "./RangeDropdown";
import {
  getRevenueByService,
  exportRevenueByServiceCsv,
  type RevenueByServiceMonthRow,
  type RevenueByServiceTotalRow,
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

function fmtMonth(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m] = ymd.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

/** ---------------------------
 * Preset helpers
 ---------------------------- */

type Preset = RangePreset;

function presetRange(preset: Preset): { start: string; end: string } {
  const months = preset === "1m" ? 1 : preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
  return { start: monthsAgoFirstDay(months), end: dateOnlyToday() };
}

/** ---------------------------
 * Component
 ---------------------------- */

export default function ServiceRevenueOverview() {
  const [preset, setPreset] = useState<Preset>("6m");
  const [exporting, setExporting] = useState(false);
  const [totals, setTotals] = useState<RevenueByServiceTotalRow[]>([]);
  const [byMonth, setByMonth] = useState<RevenueByServiceMonthRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => presetRange(preset), [preset]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const tzOffsetMinutes = new Date().getTimezoneOffset();
      const res = await getRevenueByService({ ...range, tzOffsetMinutes });
      setTotals((res.by_service_total ?? []).map((r) => ({ ...r, revenue_cents: num(r.revenue_cents), completed_count: num(r.completed_count) })));
      setByMonth((res.by_service_month ?? []).map((r) => ({ ...r, revenue_cents: num(r.revenue_cents), completed_count: num(r.completed_count) })));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load revenue by service");
      setTotals([]);
      setByMonth([]);
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
        const tzOffsetMinutes = new Date().getTimezoneOffset();
        const res = await getRevenueByService({ ...range, tzOffsetMinutes });
        if (!alive) return;
        setTotals((res.by_service_total ?? []).map((r) => ({ ...r, revenue_cents: num(r.revenue_cents), completed_count: num(r.completed_count) })));
        setByMonth((res.by_service_month ?? []).map((r) => ({ ...r, revenue_cents: num(r.revenue_cents), completed_count: num(r.completed_count) })));
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load revenue by service");
        setTotals([]);
        setByMonth([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [range]);

  // Group by_service_month by service for mini-table display
  const serviceNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const r of byMonth) {
      if (!seen.has(r.service_name)) { seen.add(r.service_name); names.push(r.service_name); }
    }
    return names;
  }, [byMonth]);

  const months = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const r of byMonth) {
      if (!seen.has(r.month_start)) { seen.add(r.month_start); list.push(r.month_start); }
    }
    return list.sort();
  }, [byMonth]);

  const byMonthMap = useMemo(() => {
    const map = new Map<string, RevenueByServiceMonthRow>();
    for (const r of byMonth) {
      map.set(`${r.service_name}::${r.month_start}`, r);
    }
    return map;
  }, [byMonth]);

  async function onExportCsv() {
    try {
      setExporting(true);
      const tzOffsetMinutes = new Date().getTimezoneOffset();
      const res = await exportRevenueByServiceCsv({ ...range, tzOffsetMinutes });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue_by_service_${range.start}_to_${range.end}.csv`;
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
          <div className="text-base font-semibold">Revenue by Service</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Completed bookings revenue broken down by service, per month
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RangeDropdown preset={preset} onPreset={setPreset} />
          <button
            type="button"
            onClick={onExportCsv}
            disabled={exporting || loading}
            title="Export CSV"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <Download className="h-4 w-4" style={{ color: "rgb(var(--muted))" }} />
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} style={{ color: "rgb(var(--muted))" }} />
          </button>
        </div>
      </div>

      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
        Showing: {range.start} → {range.end} (exclusive)
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading service revenue…
        </div>
      ) : totals.length === 0 ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          No completed bookings in this range.
        </div>
      ) : (
        <>
          {/* Totals by service */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Totals</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {totals.map((row) => (
                <div
                  key={row.service_id}
                  className="rounded-2xl border p-4 space-y-1"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                >
                  <div className="text-sm font-semibold truncate">{row.service_name}</div>
                  <div className="text-xl font-bold">{fmtMoney(row.revenue_cents)}</div>
                  <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    {fmtNum(row.completed_count)} completed job{row.completed_count !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly breakdown table */}
          {months.length > 0 && serviceNames.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Monthly Breakdown</div>
              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "rgb(var(--card))" }}>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        Service
                      </th>
                      {months.map((m) => (
                        <th
                          key={m}
                          className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap"
                          style={{ color: "rgb(var(--muted))" }}
                        >
                          {fmtMonth(m)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {serviceNames.map((name, i) => (
                      <tr
                        key={name}
                        style={{
                          background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg), 0.25)",
                          borderTop: "1px solid rgb(var(--border))",
                        }}
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{name}</td>
                        {months.map((m) => {
                          const cell = byMonthMap.get(`${name}::${m}`);
                          return (
                            <td key={m} className="px-4 py-3 text-right whitespace-nowrap">
                              {cell ? (
                                <span title={`${cell.completed_count} jobs`}>
                                  {fmtMoney(cell.revenue_cents)}
                                </span>
                              ) : (
                                <span style={{ color: "rgb(var(--muted))" }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

