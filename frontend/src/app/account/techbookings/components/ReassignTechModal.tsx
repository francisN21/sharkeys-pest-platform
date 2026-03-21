"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Search, UserRound, Wrench, X } from "lucide-react";

type TechnicianOption = {
  user_id: number;
  public_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

function techLabel(tech: TechnicianOption) {
  const full = [tech.first_name, tech.last_name].filter(Boolean).join(" ").trim();
  return full || tech.email || "Technician";
}

function formatSchedule(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt || !endsAt) return "Schedule unavailable";

  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Schedule unavailable";
  }

  const date = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const startTime = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const endTime = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${date} • ${startTime} - ${endTime}`;
}

export default function ReassignTechModal({
  open,
  onClose,
  onSubmit,
  bookingPublicId,
  technicians,
  currentWorkerId,
  customerName,
  serviceName,
  startsAt,
  endsAt,
  submitting = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (workerUserId: number) => Promise<void> | void;
  bookingPublicId: string | null;
  technicians: TechnicianOption[];
  currentWorkerId: number | null;
  customerName?: string | null;
  serviceName?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  submitting?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setError("");
      setSelectedWorkerId(null);
      return;
    }
    setSelectedWorkerId(currentWorkerId ?? null);
    setError("");
  }, [open, currentWorkerId]);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => setShowSuccess(false), 2400);
    return () => window.clearTimeout(timer);
  }, [showSuccess]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, submitting]);

  const filteredTechnicians = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return technicians;

    return technicians.filter((tech) => {
      const haystack = [
        tech.first_name,
        tech.last_name,
        tech.email,
        tech.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [technicians, query]);

  async function handleSubmit() {
    setError("");

    if (!bookingPublicId) {
      setError("Missing booking.");
      return;
    }

    if (!selectedWorkerId || !Number.isInteger(selectedWorkerId) || selectedWorkerId <= 0) {
      setError("Please select a technician.");
      return;
    }

    if (currentWorkerId && selectedWorkerId === currentWorkerId) {
      setError("That booking is already assigned to this technician.");
      return;
    }

    try {
      await onSubmit(selectedWorkerId);
      setShowSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to re-assign booking.";
      setError(message);
    }
  }

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
        transition: {
          type: "spring",
          stiffness: 320,
          damping: 28,
          mass: 0.8,
        },
      };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            {...backdropAnim}
            onClick={() => {
              if (!submitting) onClose();
            }}
          >
            <motion.div
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[rgb(var(--card))] shadow-2xl"
              {...modalAnim}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-cyan-500/10" />

              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[rgb(var(--fg))] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close reassign modal"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative p-6 sm:p-7">
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
                    <Wrench className="h-6 w-6" />
                  </div>

                  <div className="pr-10">
                    <div className="mb-1 inline-flex items-center rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                      Technician Assignment
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-[rgb(var(--fg))]">
                      Re-assign Booking
                    </h2>
                    <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                      Choose a new technician to re-assign the booking.
                    </p>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                      <div className="font-medium text-[rgb(var(--fg))]">
                        {customerName || "Customer"} • {serviceName || "Service"}
                      </div>
                      <div className="mt-1 text-[rgb(var(--muted))]">
                        {formatSchedule(startsAt, endsAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-[rgb(var(--fg))]">
                    Search technicians
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by technician name, email, or phone"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                  <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {filteredTechnicians.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-[rgb(var(--muted))]">
                        No technicians found.
                      </div>
                    ) : (
                      filteredTechnicians.map((tech) => {
                        const selected = selectedWorkerId === Number(tech.user_id);
                        const isCurrent = currentWorkerId === Number(tech.user_id);

                        return (
                          <button
                            key={tech.user_id}
                            type="button"
                            onClick={() => setSelectedWorkerId(Number(tech.user_id))}
                            className="w-full rounded-2xl border p-4 text-left transition hover:bg-white/[0.04]"
                            style={{
                              borderColor: selected ? "rgba(56, 189, 248, 0.45)" : "rgba(255,255,255,0.08)",
                              background: selected ? "rgba(14, 165, 233, 0.10)" : "rgba(255,255,255,0.02)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--fg))]">
                                    <UserRound className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-[rgb(var(--fg))]">
                                      {techLabel(tech)}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                                      {isCurrent ? "Currently assigned technician" : "Available technician"}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 grid gap-1 text-sm text-[rgb(var(--muted))]">
                                  <div>{tech.email || "No email"}</div>
                                  <div>{tech.phone || "No phone"}</div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {selected ? (
                                  <span className="inline-flex items-center rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                                    Selected
                                  </span>
                                ) : isCurrent ? (
                                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-[rgb(var(--muted))]">
                                    Current
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {error ? (
                    <motion.div
                      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
                      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                      className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <motion.button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.01, y: -1 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-fg))] shadow-lg shadow-black/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Re-assigning...
                      </>
                    ) : (
                      <>
                        <Wrench className="h-4 w-4" />
                        Confirm Re-assignment
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess ? (
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 25 }}
            className="pointer-events-none fixed inset-x-0 top-5 z-[110] flex justify-center px-4"
          >
            <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 shadow-2xl backdrop-blur-md">
              <div className="mt-0.5 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-200">
                  Booking re-assigned successfully
                </p>
                <p className="text-sm text-emerald-100/80">
                  The technician assignment has been updated.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="ml-auto rounded-full p-1 text-emerald-200/80 transition hover:bg-white/10 hover:text-emerald-100"
                aria-label="Dismiss success message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

const inputClassName =
  "h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-[rgb(var(--fg))] outline-none transition placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/10";