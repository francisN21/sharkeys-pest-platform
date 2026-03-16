"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { me, type MeResponse } from "../../../../lib/api/auth";
import {
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  listAvailabilityBlocks,
  type AvailabilityBlock,
  type AvailabilityBlockType,
} from "../../../../lib/api/availability";

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
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
function weekdaySun0(d: Date) {
  return d.getDay();
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

  return `${s.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} • ${s.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })} – ${e.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
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

        if (!res?.ok || !res.user) {
          router.replace("/login");
          return;
        }

        setMeRes(res);

        if (!isAdminOrSuperUser(res)) {
          router.replace("/account");
          return;
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      } finally {
        if (alive) setLoadingMe(false);
      }
    })();

    return () => {
      alive = false;
    };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateYmd, canUsePage, loadingMe]);

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
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return date < today0;
  }

  async function onCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!canUsePage) {
      setError("Not authorized.");
      return;
    }

    if (endHour <= startHour) {
      setError("End time must be after start time.");
      return;
    }

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

    try {
      await deleteAvailabilityBlock(publicId);
      setSuccessMsg("Availability block removed.");
      await loadBlocks(selectedDateYmd);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove availability block");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Availability Management</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Block business-wide time slots so customers cannot book unavailable windows.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {error}
        </div>
      ) : null}

      {successMsg ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(34 197 94)" }}>
          {successMsg}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3" style={{ opacity: pageLoading ? 0.7 : 1 }}>
        <div
          className="rounded-2xl border p-4 lg:col-span-2"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.15)" }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Select a Date</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                onClick={() => setMonthCursor((d) => addMonths(d, -1))}
              >
                ‹
              </button>

              <div className="text-sm font-semibold">{formatMonthYear(monthCursor)}</div>

              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                onClick={() => setMonthCursor((d) => addMonths(d, 1))}
              >
                ›
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w} className="text-center font-semibold">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarCells.map((c) => {
              const disabled = isPastDate(c.ymd);
              const active = c.ymd === selectedDateYmd;

              return (
                <button
                  key={c.ymd}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setSelectedDateYmd(c.ymd);
                  }}
                  className={cn(
                    "rounded-xl border py-2 text-sm transition",
                    active && "ring-2",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: active ? "rgba(var(--bg), 0.45)" : "rgba(var(--bg), 0.25)",
                  }}
                >
                  <span className={cn(!c.inMonth && "opacity-60")}>{c.date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.15)" }}
        >
          <form className="space-y-4" onSubmit={onCreateBlock}>
            <div className="space-y-1">
              <div className="text-sm font-semibold">Create block</div>
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                {selectedDateYmd}
              </div>
            </div>

            <Field label="Block type">
              <select
                value={blockType}
                onChange={(e) => setBlockType(e.target.value as AvailabilityBlockType)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
              >
                <option value="manual">Manual</option>
                <option value="closed">Closed</option>
                <option value="holiday">Holiday</option>
                <option value="travel_buffer">Travel buffer</option>
                <option value="time_off">Time off</option>
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
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                >
                  {hours.filter((h) => h < 23).map((h) => (
                    <option key={h} value={h}>
                      {formatTimeLabel(h)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="End time">
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                >
                  {hours.filter((h) => h > startHour).map((h) => (
                    <option key={h} value={h}>
                      {formatTimeLabel(h)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Reason">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                placeholder="Technician delayed, closed, travel buffer..."
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[100px] rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                placeholder="Optional internal note"
              />
            </Field>

            <button
              type="submit"
              disabled={saving || pageLoading}
              className="w-full rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              {saving ? "Saving..." : "Block Time"}
            </button>
          </form>
        </div>
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
      >
        <div className="mb-3">
          <div className="text-sm font-semibold">Blocks for {selectedDateYmd}</div>
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Existing unavailable windows for the selected date.
          </div>
        </div>

        {loadingBlocks ? (
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Loading...
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            No blocks for this date.
          </div>
        ) : (
          <div className="grid gap-3">
            {blocks.map((block) => (
              <div
                key={block.public_id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">{formatRange(block.starts_at, block.ends_at)}</div>
                    <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                      {block.block_type}
                      {block.reason ? ` • ${block.reason}` : ""}
                    </div>
                    {block.notes ? (
                      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        {block.notes}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => void onDeleteBlock(block.public_id)}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                    style={{ borderColor: "rgb(var(--border))", background: "transparent" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {label}
      </div>
      {children}
    </div>
  );
}