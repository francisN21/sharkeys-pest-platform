"use client";

import React, { useEffect } from "react";

function clampNonNegInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  const x = Math.floor(n);
  return x < 0 ? 0 : x;
}

function fmtMoneyFromCents(cents: number) {
  const n = Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function dollarsStringFromCents(cents: number | null | undefined) {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return (n / 100).toFixed(2);
}

export function parseDollarInputToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return clampNonNegInt(Math.round(amount * 100));
}

type Props = {
  open: boolean;
  busy: boolean;
  bookingId: string | null;
  bookingTitle: string | null;
  priceInput: string;
  priceLoading: boolean;
  errorText?: string | null;
  onPriceInputChange: (value: string) => void;
  onPriceInputBlur: () => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function CompleteWithPriceModal({
  open,
  busy,
  bookingId,
  bookingTitle,
  priceInput,
  priceLoading,
  errorText,
  onPriceInputChange,
  onPriceInputBlur,
  onClose,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const cents = parseDollarInputToCents(priceInput);
  const valid = cents !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
        disabled={busy}
      />

      <div
        className="relative w-full max-w-lg rounded-2xl border p-4 shadow-lg"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        role="dialog"
        aria-modal="true"
        aria-label="Complete job"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold">Complete this job</div>
            <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              Final price is required before completion. We’ll also post a completion message in the booking chat.
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg border px-2 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={onClose}
            disabled={busy}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div
          className="mt-3 rounded-xl border p-3 text-sm space-y-2"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
              Booking
            </div>
            <div className="font-semibold truncate">{bookingTitle ?? "—"}</div>
            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Booking ID: <span className="font-mono">{bookingId ?? "—"}</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-xs font-semibold mb-1" style={{ color: "rgb(var(--muted))" }}>
              Final price — required
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  $
                </span>

                <input
                  value={priceInput}
                  onChange={(e) => onPriceInputChange(e.target.value)}
                  onBlur={onPriceInputBlur}
                  placeholder={priceLoading ? "Loading price..." : "e.g. 300.00"}
                  inputMode="decimal"
                  className="w-full rounded-xl border py-2 pl-7 pr-3 text-sm"
                  style={{
                    borderColor: errorText ? "rgb(239 68 68)" : "rgb(var(--border))",
                    background: "rgb(var(--card))",
                  }}
                  disabled={busy || priceLoading}
                />
              </div>

              <div className="text-sm font-semibold whitespace-nowrap">
                {valid && cents !== null ? fmtMoneyFromCents(cents) : "—"}
              </div>
            </div>

            {errorText ? (
              <div className="mt-2 text-xs" style={{ color: "rgb(239 68 68)" }}>
                {errorText}
              </div>
            ) : (
              <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                {priceLoading
                  ? "Loading base price…"
                  : "This autofills from the booking price or service base price. You can adjust it before completing."}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={onClose}
            disabled={busy}
            title="Cancel"
          >
            Cancel
          </button>

          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            onClick={onConfirm}
            disabled={busy || priceLoading}
            title="Complete job"
          >
            {busy ? "Working…" : "Set price & complete"}
          </button>
        </div>
      </div>
    </div>
  );
}