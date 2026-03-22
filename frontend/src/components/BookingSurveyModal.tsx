"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import type { SurveyCode } from "../lib/api/survey";

// ─── Icons for each source ─────────────────────────────────────────────────────

const SOURCE_OPTIONS: { value: SurveyCode; label: string; emoji: string }[] = [
  { value: "linkedin", label: "LinkedIn", emoji: "💼" },
  { value: "google", label: "Google", emoji: "🔍" },
  { value: "instagram", label: "Instagram", emoji: "📸" },
  { value: "facebook", label: "Facebook", emoji: "👥" },
  { value: "referral", label: "Referral", emoji: "🤝" },
  { value: "other", label: "Other", emoji: "✨" },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;

  heardFrom: SurveyCode | "";
  setHeardFrom: (v: SurveyCode | "") => void;

  referrerName: string;
  setReferrerName: (v: string) => void;

  otherText: string;
  setOtherText: (v: string) => void;

  submitting?: boolean;
  onSubmit: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingSurveyModal(props: Props) {
  const {
    open,
    onClose,
    onSkip,
    heardFrom,
    setHeardFrom,
    referrerName,
    setReferrerName,
    otherText,
    setOtherText,
    submitting,
    onSubmit,
  } = props;

  const shouldReduceMotion = useReducedMotion();
  const needsOther = heardFrom === "other";
  const needsRef = heardFrom === "referral";

  const canSubmit = useMemo(() => {
    if (!heardFrom) return false;
    if (needsOther) return otherText.trim().length >= 2;
    if (needsRef) return referrerName.trim().length >= 2;
    return true;
  }, [heardFrom, needsOther, otherText, needsRef, referrerName]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, submitting]);

  const backdropAnim = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18 },
      };

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          {...backdropAnim}
          onClick={() => { if (!submitting) onClose(); }}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[rgb(var(--card))] shadow-2xl"
            {...modalAnim}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Quick survey"
          >
            {/* Gradient header */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10" />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={!!submitting}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[rgb(var(--fg))] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close survey"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-6 sm:p-7">
              {/* Header */}
              <div className="mb-5 flex items-start gap-4 pr-10">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-2xl">
                  🎉
                </div>
                <div>
                  <div className="mb-0.5 inline-flex items-center rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                    One-time question
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-[rgb(var(--fg))]">
                    How did you find us?
                  </h2>
                  <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                    Helps us understand where our customers come from.
                  </p>
                </div>
              </div>

              {/* Options */}
              <div className="grid gap-2 sm:grid-cols-2">
                {SOURCE_OPTIONS.map((opt) => {
                  const selected = heardFrom === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setHeardFrom(opt.value)}
                      className="flex items-center gap-3 rounded-2xl border p-3 text-left transition hover:bg-white/[0.04]"
                      style={{
                        borderColor: selected ? "rgba(56,189,248,0.45)" : "rgba(255,255,255,0.08)",
                        background: selected ? "rgba(14,165,233,0.10)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span className="text-xl leading-none">{opt.emoji}</span>
                      <span className="flex-1 text-sm font-medium text-[rgb(var(--fg))]">
                        {opt.label}
                      </span>
                      {selected ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Conditional inputs */}
              <AnimatePresence>
                {needsRef ? (
                  <motion.div
                    initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, height: "auto" }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4">
                      <label className="mb-1.5 block text-xs font-semibold text-[rgb(var(--muted))]">
                        Who referred you?
                      </label>
                      <input
                        value={referrerName}
                        onChange={(e) => setReferrerName(e.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
                        placeholder="Their name…"
                      />
                    </div>
                  </motion.div>
                ) : null}

                {needsOther ? (
                  <motion.div
                    initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, height: "auto" }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4">
                      <label className="mb-1.5 block text-xs font-semibold text-[rgb(var(--muted))]">
                        Please specify
                      </label>
                      <input
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
                        placeholder="e.g., Yelp, flyer, neighbor…"
                      />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Footer */}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={!!submitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Skip
                </button>

                <motion.button
                  type="button"
                  onClick={onSubmit}
                  disabled={!!submitting || !canSubmit}
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.01, y: -1 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-fg))] shadow-lg shadow-black/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  title={!canSubmit ? "Select an option (and fill the required field if needed)" : "Submit"}
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submit
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
