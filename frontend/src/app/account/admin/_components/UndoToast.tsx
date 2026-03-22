"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Undo2, X } from "lucide-react";

export type UndoToastState = {
  id: string;
  message: string;
  onUndo: () => void;
} | null;

const UNDO_DURATION_MS = 5000;

export default function UndoToast({
  toast,
  onDismiss,
}: {
  toast: UndoToastState;
  onDismiss: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, UNDO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.id}
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: -14, scale: 0.97 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 25 }}
          className="pointer-events-none fixed inset-x-0 top-5 z-[110] flex justify-center px-4"
        >
          <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-amber-500/25 bg-[rgb(var(--card))] px-4 py-3 shadow-2xl backdrop-blur-md">
            <p className="min-w-0 flex-1 text-sm font-medium text-[rgb(var(--fg))]">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => {
                toast.onUndo();
                onDismiss();
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25"
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-full p-1 text-[rgb(var(--muted))] transition hover:bg-white/10 hover:text-[rgb(var(--fg))]"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
