"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const backdropAnim = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
} as const;

const modalAnim = {
  hidden: { opacity: 0, scale: 0.97, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 28 },
  },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.14 } },
};

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
      if (e.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  const cents = parseDollarInputToCents(priceInput);
  const valid = cents !== null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.6)" }}
          variants={backdropAnim}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] shadow-xl"
            style={{ background: "rgb(var(--card))" }}
            role="dialog"
            aria-modal="true"
            aria-label="Complete job"
            variants={modalAnim}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  Complete this job
                </div>
                <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                  Final price is required before completion. A completion
                  message will be posted in the booking chat.
                </div>
              </div>
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[rgb(var(--muted))] transition hover:bg-white/[0.06] disabled:opacity-60"
                onClick={onClose}
                disabled={busy}
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div
                className="rounded-xl border p-3 text-sm"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(var(--bg), 0.25)",
                }}
              >
                <div className="space-y-1">
                  <div
                    className="text-xs font-semibold"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    Booking
                  </div>
                  <div className="truncate font-semibold">
                    {bookingTitle ?? "—"}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    ID: <span className="font-mono">{bookingId ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div>
                <div
                  className="mb-1.5 text-xs font-semibold"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Final price — required
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
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
                      className="w-full rounded-xl border py-2 pl-7 pr-3 text-sm outline-none"
                      style={{
                        borderColor: errorText
                          ? "rgb(239 68 68)"
                          : "rgb(var(--border))",
                        background: "rgb(var(--card))",
                        color: "rgb(var(--fg))",
                      }}
                      disabled={busy || priceLoading}
                    />
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {valid && cents !== null ? fmtMoneyFromCents(cents) : "—"}
                  </div>
                </div>

                {errorText ? (
                  <p className="mt-2 text-xs" style={{ color: "rgb(239 68 68)" }}>
                    {errorText}
                  </p>
                ) : (
                  <p
                    className="mt-2 text-xs"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    {priceLoading
                      ? "Loading base price…"
                      : "Autofills from booking or service base price. Adjust before completing."}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] pt-4">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium transition hover:bg-white/[0.06] active:scale-[0.97] disabled:opacity-60"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
                  style={{
                    borderColor: "rgb(var(--primary))",
                    background: "rgb(var(--primary))",
                    color: "rgb(var(--primary-fg))",
                  }}
                  onClick={onConfirm}
                  disabled={busy || priceLoading}
                >
                  {busy ? "Working…" : "Set price & complete"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
