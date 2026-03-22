"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function ConfirmCancelModal({
  open,
  bookingId,
  serviceTitle,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  bookingId: string | null;
  serviceTitle: string | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        disabled={busy}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] shadow-xl"
        style={{ background: "rgb(var(--card))" }}
        role="dialog"
        aria-modal="true"
        aria-label="Cancel booking confirmation"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">Cancel this booking?</div>
            <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
              This will cancel your appointment request.
            </div>
          </div>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[rgb(var(--muted))] transition hover:bg-white/[0.06] disabled:opacity-60"
            onClick={onClose}
            disabled={busy}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Booking
            </div>
            <div className="mt-1 truncate font-semibold text-[rgb(var(--fg))]">{serviceTitle ?? "—"}</div>
            <div className="mt-1 text-xs text-[rgb(var(--muted))]">
              ID: <span className="font-mono">{bookingId ?? "—"}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-60"
              onClick={onClose}
              disabled={busy}
            >
              Keep
            </button>

            <button
              type="button"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Cancelling…" : "Yes, cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
