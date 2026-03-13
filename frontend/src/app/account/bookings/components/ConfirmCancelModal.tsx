"use client";

import React, { useEffect } from "react";

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
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
        disabled={busy}
      />

      <div
        className="relative w-full max-w-md rounded-2xl border p-4 shadow-lg"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        role="dialog"
        aria-modal="true"
        aria-label="Cancel booking confirmation"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold">Cancel this booking?</div>
            <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              This will cancel your appointment request.
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
          className="mt-3 rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
        >
          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
            Booking
          </div>
          <div className="mt-1 font-semibold truncate">{serviceTitle ?? "—"}</div>
          <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
            Booking ID: <span className="font-mono">{bookingId ?? "—"}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={onClose}
            disabled={busy}
          >
            Keep
          </button>

          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}