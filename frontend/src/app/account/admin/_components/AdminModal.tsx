"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

export default function AdminModal({
  open,
  onClose,
  disabled,
  title,
  subtitle,
  icon,
  accentFrom,
  accentVia,
  accentTo,
  maxWidth = "max-w-md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accentFrom?: string;
  accentVia?: string;
  accentTo?: string;
  maxWidth?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !disabled) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, disabled]);

  const backdropAnim = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18 },
      } as const;

  const modalAnim = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18, scale: 0.97, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, y: 10, scale: 0.98, filter: "blur(4px)" },
        transition: { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.8 },
      };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          {...backdropAnim}
          onClick={() => {
            if (!disabled) onClose();
          }}
        >
          <motion.div
            className={`relative w-full ${maxWidth} overflow-hidden rounded-3xl border border-white/10 bg-[rgb(var(--card))] shadow-2xl`}
            {...modalAnim}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute inset-x-0 top-0 h-24"
              style={{
                background: `linear-gradient(to right, ${accentFrom ?? "rgba(14,165,233,0.10)"}, ${accentVia ?? "rgba(99,102,241,0.10)"}, ${accentTo ?? "rgba(6,182,212,0.10)"})`,
              }}
            />

            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[rgb(var(--fg))] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-6 sm:p-7">
              <div className="mb-5 flex items-start gap-4">
                {icon ? (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0 pr-10 pt-1">
                  <h2 className="text-xl font-semibold tracking-tight text-[rgb(var(--fg))]">
                    {title}
                  </h2>
                  {subtitle ? (
                    <p className="mt-1 text-sm text-[rgb(var(--muted))]">{subtitle}</p>
                  ) : null}
                </div>
              </div>

              {children}

              {footer ? (
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  {footer}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
