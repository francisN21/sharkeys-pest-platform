// frontend/src/components/su-dashboard/RangeDropdown.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

export type RangePreset = "1m" | "3m" | "6m" | "12m";

export const PRESET_LABELS: Record<RangePreset, string> = {
  "1m": "Last month",
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "12m": "Last year",
};

type Props = {
  preset: RangePreset | null;
  onPreset: (p: RangePreset) => void;
  presets?: RangePreset[];
  /** Pass these to show a "Custom range" section with date inputs in the dropdown */
  customStart?: string;
  customEnd?: string;
  onCustomStart?: (v: string) => void;
  onCustomEnd?: (v: string) => void;
  endLabel?: string;
};

export function RangeDropdown({
  preset,
  onPreset,
  presets = ["1m", "3m", "6m", "12m"],
  customStart,
  customEnd,
  onCustomStart,
  onCustomEnd,
  endLabel = "End (exclusive)",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = preset ? PRESET_LABELS[preset] : "Custom range";
  const hasCustom = !!onCustomStart;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
      >
        <CalendarDays className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(var(--muted))" }} />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          style={{ color: "rgb(var(--muted))" }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl border shadow-xl overflow-hidden"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          {/* Presets */}
          <div className="py-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { onPreset(p); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 text-sm transition-opacity hover:opacity-75"
                style={{
                  background: preset === p ? "rgba(var(--fg), 0.07)" : "transparent",
                  fontWeight: preset === p ? 700 : 500,
                }}
              >
                <span>{PRESET_LABELS[p]}</span>
                {preset === p && <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "rgb(16,185,129)" }} />}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {hasCustom && (
            <>
              <div className="h-px mx-3" style={{ background: "rgb(var(--border))" }} />
              <div className="p-3 space-y-2">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  Custom range
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: "rgb(var(--muted))" }}>Start</div>
                  <input
                    type="date"
                    value={customStart ?? ""}
                    onChange={(e) => { onCustomStart?.(e.target.value); }}
                    className="w-full rounded-xl border px-2.5 py-1.5 text-xs"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.5)" }}
                  />
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: "rgb(var(--muted))" }}>{endLabel}</div>
                  <input
                    type="date"
                    value={customEnd ?? ""}
                    onChange={(e) => { onCustomEnd?.(e.target.value); }}
                    className="w-full rounded-xl border px-2.5 py-1.5 text-xs"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.5)" }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
