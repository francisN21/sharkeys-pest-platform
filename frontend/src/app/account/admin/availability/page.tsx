"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, X } from "lucide-react";
import { me, type MeResponse } from "../../../../lib/api/auth";
import {
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  listAvailabilityBlocks,
  type AvailabilityBlock,
  type AvailabilityBlockType,
} from "../../../../lib/api/availability";
import UndoToast, { type UndoToastState } from "../_components/UndoToast";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localIsoFromDateAndHour(dateYmd: string, hour24: number) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  return new Date(y, m - 1, d, hour24, 0, 0, 0).toISOString();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
function weekdaySun0(d: Date) {
  return d.getDay();
}
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function formatMonthYear(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function formatTimeLabel(hour24: number) {
  const h = hour24 % 12 || 12;
  const ampm = hour24 < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
}
function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  return `${s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} • ${s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

type MeUserWithRoles = NonNullable<MeResponse["user"]> & {
  roles?: string[] | null;
  user_role?: string | null;
};

function isAdminOrSuperUser(meRes: MeResponse | null) {
  const u = (meRes?.user as MeUserWithRoles | null) ?? null;
  const roles = u?.roles ?? null;
  if (!roles || !Array.isArray(roles)) return false;
  const set = roles.map((r) => String(r).trim().toLowerCase());
  return set.includes("admin") || set.includes("superuser");
}

const BLOCK_TYPE_META: Record<AvailabilityBlockType, { label: string; color: string }> = {
  manual: { label: "Manual", color: "rgba(148,163,184,0.20)" },
  closed: { label: "Closed", color: "rgba(239,68,68,0.18)" },
  holiday: { label: "Holiday", color: "rgba(99,102,241,0.18)" },
  travel_buffer: { label: "Travel Buffer", color: "rgba(245,158,11,0.16)" },
  time_off: { label: "Time Off", color: "rgba(34,197,94,0.14)" },
};

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminAvailabilityPage() {
  const router = useRouter();

  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [saving, setSaving] = useState(false);

  const [meRes, setMeRes] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const todayYmd = useMemo(() => ymdLocal(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(todayYmd);

  const [startHour, setStartHour] = useState<number>(9);
  const [endHour, setEndHour] = useState<number>(10);
  const [blockType, setBlockType] = useState<AvailabilityBlockType>("manual");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);

  // Undo for delete block
  const [undoToast, setUndoToast] = useState<UndoToastState>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageLoading = loadingMe || loadingBlocks;
  const canUsePage = useMemo(() => isAdminOrSuperUser(meRes), [meRes]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingMe(true);
        const res = await me();
        if (!alive) return;
        if (!res?.ok || !res.user) { router.replace("/login"); return; }
        setMeRes(res);
        if (!isAdminOrSuperUser(res)) { router.replace("/account"); return; }
      } catch {
        if (!alive) return;
        router.replace("/login");
      } finally {
        if (alive) setLoadingMe(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  async function loadBlocks(dateYmd: string) {
    try {
      setLoadingBlocks(true);
      setError(null);
      const res = await listAvailabilityBlocks({
        date: dateYmd,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });
      setBlocks(res.blocks || []);
    } catch (e: unknown) {
      setBlocks([]);
      setError(e instanceof Error ? e.message : "Failed to load availability blocks");
    } finally {
      setLoadingBlocks(false);
    }
  }

  useEffect(() => {
    if (!canUsePage && !loadingMe) return;
    void loadBlocks(selectedDateYmd);
  }, [selectedDateYmd, canUsePage, loadingMe]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const calendarCells = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const end = endOfMonth(monthCursor);
    const startDow = weekdaySun0(start);
    const daysInMonth = end.getDate();
    const cells: Array<{ ymd: string; inMonth: boolean; date: Date }> = [];

    const prevMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0);
    const prevDays = prevMonthEnd.getDate();
    for (let i = 0; i < startDow; i++) {
      const day = prevDays - (startDow - 1 - i);
      const d = new Date(start.getFullYear(), start.getMonth() - 1, day);
      cells.push({ ymd: ymdLocal(d), inMonth: false, date: d });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(start.getFullYear(), start.getMonth(), day);
      cells.push({ ymd: ymdLocal(d), inMonth: true, date: d });
    }
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      cells.push({ ymd: ymdLocal(d), inMonth: false, date: d });
    }
    return cells;
  }, [monthCursor]);

  function isPastDate(ymd: string) {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date < today0;
  }

  async function onCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!canUsePage) { setError("Not authorized."); return; }
    if (endHour <= startHour) { setError("End time must be after start time."); return; }

    try {
      setSaving(true);
      await createAvailabilityBlock({
        startsAt: localIsoFromDateAndHour(selectedDateYmd, startHour),
        endsAt: localIsoFromDateAndHour(selectedDateYmd, endHour),
        blockType,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccessMsg("Availability block created.");
      setReason("");
      setNotes("");
      await loadBlocks(selectedDateYmd);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create availability block");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteBlock(publicId: string) {
    setError(null);
    setSuccessMsg(null);

    // Optimistically remove
    const removed = blocks.find((b) => b.public_id === publicId) ?? null;
    setBlocks((prev) => prev.filter((b) => b.public_id !== publicId));

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const restore = () => {
      if (removed) setBlocks((prev) => [...prev, removed].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    };

    setUndoToast({
      id: Date.now().toString(),
      message: `Block "${BLOCK_TYPE_META[removed?.block_type ?? "manual"]?.label ?? "Block"}" removed`,
      onUndo: restore,
    });

    undoTimerRef.current = setTimeout(async () => {
      setUndoToast(null);
      try {
        await deleteAvailabilityBlock(publicId);
        setSuccessMsg("Availability block removed.");
        await loadBlocks(selectedDateYmd);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to remove availability block");
        restore();
      }
    }, 5000);
  }

  return (
    <>
      <UndoToast toast={undoToast} onDismiss={() => setUndoToast(null)} />

      <div className="space-y-5">
        {/* Page header */}
        <div>
          <h2 className="text-xl font-bold text-[rgb(var(--fg))]">Availability</h2>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Block time slots to prevent customers from booking unavailable windows.
          </p>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}><X className="h-4 w-4" /></button>
            </motion.div>
          ) : null}
          {successMsg ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
            >
              <span>{successMsg}</span>
              <button type="button" onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="grid gap-4 lg:grid-cols-3" style={{ opacity: pageLoading ? 0.7 : 1 }}>
          {/* Calendar */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] lg:col-span-2">
            <div className="border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">Select a Date</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMonthCursor((d) => addMonths(d, -1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold transition hover:bg-white/[0.07]"
                  >
                    ‹
                  </button>
                  <div className="min-w-[140px] text-center text-sm font-semibold text-[rgb(var(--fg))]">
                    {formatMonthYear(monthCursor)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMonthCursor((d) => addMonths(d, 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold transition hover:bg-white/[0.07]"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((c) => {
                  const disabled = isPastDate(c.ymd);
                  const active = c.ymd === selectedDateYmd;
                  const isToday = c.ymd === todayYmd;

                  return (
                    <button
                      key={c.ymd}
                      type="button"
                      disabled={disabled}
                      onClick={() => { if (!disabled) setSelectedDateYmd(c.ymd); }}
                      className={cn(
                        "relative rounded-xl py-2.5 text-sm font-medium transition",
                        active
                          ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))]"
                          : "hover:bg-white/[0.06]",
                        disabled && "cursor-not-allowed opacity-30",
                        !c.inMonth && !active && "opacity-40"
                      )}
                    >
                      {c.date.getDate()}
                      {isToday && !active ? (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Create block form */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <div className="border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">Block Time</div>
                  <div className="text-xs text-[rgb(var(--muted))]">{selectedDateYmd}</div>
                </div>
              </div>
            </div>

            <form className="space-y-4 p-4" onSubmit={onCreateBlock}>
              <Field label="Block type">
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value as AvailabilityBlockType)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-[rgb(var(--card))] px-3 text-sm focus:outline-none"
                >
                  {(Object.entries(BLOCK_TYPE_META) as [AvailabilityBlockType, typeof BLOCK_TYPE_META[AvailabilityBlockType]][]).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start time">
                  <select
                    value={startHour}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setStartHour(next);
                      if (endHour <= next) setEndHour(Math.min(23, next + 1));
                    }}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[rgb(var(--card))] px-3 text-sm focus:outline-none"
                  >
                    {hours.filter((h) => h < 23).map((h) => (
                      <option key={h} value={h}>{formatTimeLabel(h)}</option>
                    ))}
                  </select>
                </Field>

                <Field label="End time">
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[rgb(var(--card))] px-3 text-sm focus:outline-none"
                  >
                    {hours.filter((h) => h > startHour).map((h) => (
                      <option key={h} value={h}>{formatTimeLabel(h)}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Reason">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none"
                  placeholder="Technician delayed, closed…"
                />
              </Field>

              <Field label="Notes (optional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none"
                  placeholder="Optional internal note"
                />
              </Field>

              <motion.button
                type="submit"
                disabled={saving || pageLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-red-500 disabled:opacity-60"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving…
                  </span>
                ) : "Block Time"}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Existing blocks */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="border-b border-white/[0.07] bg-white/[0.03] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  Blocks for {selectedDateYmd}
                </div>
                <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                  Existing unavailable windows. Deletions can be undone for 5s.
                </div>
              </div>
              {loadingBlocks ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-[rgb(var(--muted))]" />
              ) : null}
            </div>
          </div>

          <div className="p-4">
            {!loadingBlocks && blocks.length === 0 ? (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center text-sm text-[rgb(var(--muted))]">
                No blocks for this date.
              </div>
            ) : (
              <div className="grid gap-2">
                <AnimatePresence>
                  {blocks.map((block) => {
                    const meta = BLOCK_TYPE_META[block.block_type] ?? BLOCK_TYPE_META.manual;
                    return (
                      <motion.div
                        key={block.public_id}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden rounded-xl border border-white/[0.07]"
                        style={{ background: meta.color }}
                      >
                        <div className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                              {formatRange(block.starts_at, block.ends_at)}
                            </div>
                            <div className="text-xs font-medium text-[rgb(var(--muted))]">
                              {meta.label}
                              {block.reason ? ` · ${block.reason}` : ""}
                            </div>
                            {block.notes ? (
                              <div className="text-xs text-[rgb(var(--muted))]">{block.notes}</div>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => void onDeleteBlock(block.public_id)}
                            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold transition hover:bg-red-500/15 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
