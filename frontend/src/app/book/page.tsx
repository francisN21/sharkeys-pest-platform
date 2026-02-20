"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { getServices, type Service } from "../../lib/api/services";
import { createBooking } from "../../lib/api/bookings";
import { me, type MeResponse } from "../../lib/api/auth";

import BookingSurveyModal from "../../components/BookingSurveyModal";
import { surveyNeeded, submitSurvey, type SurveyCode } from "../../lib/api/survey";
import { getBookingAvailability, type AvailabilityBooking } from "../../lib/api/bookings";

/**
 * Helpers
 */
function dollarsFromCents(cents?: number | null) {
  if (typeof cents !== "number") return null;
  return (cents / 100).toFixed(2);
}

// Treats input as local time and returns ISO string
function localDateTimeToIsoFromParts(dateYmd: string, timeHHmm: string) {
  // dateYmd: "YYYY-MM-DD", timeHHmm: "HH:MM"
  const [y, m, d] = dateYmd.split("-").map((x) => Number(x));
  const [hh, mm] = timeHHmm.split(":").map((x) => Number(x));
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0); // local
  return dt.toISOString();
}

function addMinutesIso(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isSameYmd(a: string, b: string) {
  return a === b;
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

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function weekdaySun0(d: Date) {
  return d.getDay(); // 0=Sun
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatTimeLabel(hour24: number) {
  const h = hour24 % 12 || 12;
  const ampm = hour24 < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function blocksNeeded(durationMinutes: number) {
  // 1-hour blocks
  return Math.max(1, Math.ceil(durationMinutes / 60));
}

function formatSelectedHeader(dateYmd: string, startHour: number | null, blocks: number) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const base = new Date(y, m - 1, d, 0, 0, 0, 0);

  const dayLabel = base.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  if (startHour === null) return dayLabel;

  const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
  const end = new Date(start.getTime() + blocks * 60 * 60_000);

  const startLabel = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return `${dayLabel} • ${startLabel} – ${endLabel}`;
}

/**
 * Recurrence UI types (frontend-only for now)
 */
type RecurrenceFreq = "" | "biweekly" | "monthly" | "quarterly";

export default function BookPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // user
  const [user, setUser] = useState<MeResponse["user"] | null>(null);

  // form state
  const [servicePublicId, setServicePublicId] = useState("");

  // NEW: calendar & time selection state
  const todayYmd = useMemo(() => ymdLocal(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(() => todayYmd);

  // Calendly-style mini-step: click → pending, then confirm
  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
  const [pendingStartHour, setPendingStartHour] = useState<number | null>(null);

  // availability (booked intervals for selected date)
  const [availLoading, setAvailLoading] = useState(false);
  const [booked, setBooked] = useState<AvailabilityBooking[]>([]);

  // address UX
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [serviceAddress, setServiceAddress] = useState(""); // only used when checkbox is ON

  const [notes, setNotes] = useState("");

  // ✅ Survey modal state
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [createdBookingPublicId, setCreatedBookingPublicId] = useState<string | null>(null);

  const [surveyHeardFrom, setSurveyHeardFrom] = useState<SurveyCode | "">("");
  const [surveyReferrerName, setSurveyReferrerName] = useState("");
  const [surveyOtherText, setSurveyOtherText] = useState("");

  // NEW: recurrence UI state
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurrenceFreq>("");
  const [recurringCount, setRecurringCount] = useState<number>(1); // how many times after first
  const [recurringSameTime, setRecurringSameTime] = useState(true);

  const selectedService = useMemo(
    () => services.find((s) => s.public_id === servicePublicId) || null,
    [services, servicePublicId]
  );

  const durationMinutes = selectedService?.duration_minutes ?? 60;
  const neededBlocks = useMemo(() => blocksNeeded(durationMinutes), [durationMinutes]);

  // Allow bookings up to 60 days out
  const maxBookDateYmd = useMemo(() => ymdLocal(addDays(new Date(), 60)), []);

  // 24-hour time slots (0..23)
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const defaultAddress = (user?.address || "").trim();

  const finalAddress = useMemo(() => {
    return useDifferentAddress ? serviceAddress.trim() : defaultAddress;
  }, [useDifferentAddress, serviceAddress, defaultAddress]);

  // computed ISO times based on date + selectedStartHour
  const startsAtIso = useMemo(() => {
    if (!selectedDateYmd) return null;
    if (selectedStartHour === null) return null;
    const hhmm = `${pad2(selectedStartHour)}:00`;
    return localDateTimeToIsoFromParts(selectedDateYmd, hhmm);
  }, [selectedDateYmd, selectedStartHour]);

  const computedEndsAtIso = useMemo(() => {
    if (!startsAtIso) return null;
    return addMinutesIso(startsAtIso, durationMinutes);
  }, [startsAtIso, durationMinutes]);

  // Load services
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingServices(true);
        setError(null);

        const res = await getServices();
        if (!alive) return;

        const list = res.services || [];
        setServices(list);

        if (!servicePublicId && list.length) {
          setServicePublicId(list[0].public_id);
        }
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to load services";
        setError(msg);
      } finally {
        if (alive) setLoadingServices(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load current user (for address prefill)
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

        setUser(res.user);

        // If user has no saved address, automatically force different-address mode
        if (!res.user.address || res.user.address.trim().length < 5) {
          setUseDifferentAddress(true);
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

  // Availability fetch when date changes
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setAvailLoading(true);
        const tzOffsetMinutes = new Date().getTimezoneOffset();
        const res = await getBookingAvailability({ date: selectedDateYmd, tzOffsetMinutes });
        if (!alive) return;
        setBooked(res.bookings || []);
      } catch {
        if (!alive) return;
        setBooked([]);
      } finally {
        if (alive) setAvailLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedDateYmd]);

  // Clear selection if service duration changes
  useEffect(() => {
    setSelectedStartHour(null);
    setPendingStartHour(null);
  }, [servicePublicId, neededBlocks]);

  async function openSurveyIfNeeded() {
    try {
      const r = await surveyNeeded();
      if (r?.ok && r.needed) {
        setSurveyOpen(true);
      } else {
        router.push("/account");
      }
    } catch {
      router.push("/account");
    }
  }

  async function onSubmitSurvey() {
    if (!surveyHeardFrom) return;

    if (surveyHeardFrom === "other" && surveyOtherText.trim().length < 2) {
      setError("Please specify 'Other' (at least 2 characters).");
      return;
    }
    if (surveyHeardFrom === "referred" && surveyReferrerName.trim().length < 2) {
      setError("Please enter a name (at least 2 characters).");
      return;
    }

    try {
      setSurveySubmitting(true);
      setError(null);

      await submitSurvey({
        bookingPublicId: createdBookingPublicId ?? undefined,
        heard_from: surveyHeardFrom,
        referrer_name: surveyHeardFrom === "referred" ? surveyReferrerName.trim() : undefined,
        other_text: surveyHeardFrom === "other" ? surveyOtherText.trim() : undefined,
      });

      setSurveyOpen(false);
      router.push("/account");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit survey");
    } finally {
      setSurveySubmitting(false);
    }
  }

  const pageLoading = loadingServices || loadingMe;

  // Calendar grid for monthCursor
  const calendarCells = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const end = endOfMonth(monthCursor);

    const startDow = weekdaySun0(start);
    const daysInMonth = end.getDate();

    // build 6 weeks x 7 days
    const cells: Array<{ ymd: string; inMonth: boolean; date: Date }> = [];

    // previous month spill
    const prevMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0);
    const prevDays = prevMonthEnd.getDate();
    for (let i = 0; i < startDow; i++) {
      const day = prevDays - (startDow - 1 - i);
      const d = new Date(start.getFullYear(), start.getMonth() - 1, day);
      cells.push({ ymd: ymdLocal(d), inMonth: false, date: d });
    }

    // current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(start.getFullYear(), start.getMonth(), day);
      cells.push({ ymd: ymdLocal(d), inMonth: true, date: d });
    }

    // next month spill to fill 42 cells
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      cells.push({ ymd: ymdLocal(d), inMonth: false, date: d });
    }

    return cells;
  }, [monthCursor]);

  // Build disabled logic for time slots based on booked intervals + neededBlocks
  const bookedIntervals = useMemo(() => {
    return booked.map((b) => ({
      start: new Date(b.starts_at),
      end: new Date(b.ends_at),
      status: b.status,
    }));
  }, [booked]);

  function isPastDate(ymd: string) {
    const [y, m, d] = ymd.split("-").map((x) => Number(x));
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return date < today0;
  }

  function slotIsBlocked(dateYmd: string, startHour: number) {
    // need N consecutive 1-hour blocks
    const [y, m, d] = dateYmd.split("-").map((x) => Number(x));
    const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
    const end = new Date(start.getTime() + neededBlocks * 60 * 60_000);

    // must stay within same day (no crossing to next date)
    if (startHour + neededBlocks > 24) return true;

    // overlap with any booking interval
    for (const it of bookedIntervals) {
      if (overlaps(start, end, it.start, it.end)) return true;
    }

    // If selecting today, prevent picking time in the past (simple rule)
    const today = ymdLocal(new Date());
    if (isSameYmd(dateYmd, today)) {
      const now = new Date();
      if (start <= now) return true;
    }

    return false;
  }

  function buildRecurringNote() {
    if (!recurringEnabled) return "";
    const freqLabel =
      recurringFreq === "biweekly"
        ? "Every 2 weeks"
        : recurringFreq === "monthly"
        ? "Monthly"
        : recurringFreq === "quarterly"
        ? "Every 3 months"
        : "Recurring";

    const countLabel = recurringCount > 0 ? `${recurringCount} time(s)` : "unspecified times";
    const sameLabel = recurringSameTime ? "same day/time" : "time may vary";

    return `\n\n[Recurring Request]\n- Frequency: ${freqLabel}\n- Repeat: ${countLabel}\n- Preference: ${sameLabel}\n`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);

    if (!servicePublicId) return setError("Please select a service.");
    if (!selectedDateYmd || selectedStartHour === null) return setError("Please select a date and time.");
    if (!startsAtIso || !computedEndsAtIso) return setError("Could not compute schedule.");

    // Address rules:
    if (!useDifferentAddress) {
      if (defaultAddress.length < 5) {
        return setError("Your account has no saved address. Please use a different address.");
      }
    } else {
      if (serviceAddress.trim().length < 5) {
        return setError("Please enter a valid address (at least 5 characters).");
      }
    }

    // client-side double booking protection
    if (slotIsBlocked(selectedDateYmd, selectedStartHour)) {
      return setError("That time is no longer available. Please select another slot.");
    }

    const finalNotes = (notes.trim() ? notes.trim() : "") + (recurringEnabled ? buildRecurringNote() : "");

    try {
      setLoadingSubmit(true);

      const created = await createBooking({
        servicePublicId,
        startsAt: startsAtIso,
        endsAt: computedEndsAtIso,
        address: finalAddress,
        notes: finalNotes.trim() ? finalNotes.trim() : undefined,
      });

      const bookingPid = created?.booking?.public_id ?? null;
      setCreatedBookingPublicId(bookingPid);

      setSuccessMsg("Booking created!");

      await openSurveyIfNeeded();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create booking";
      setError(msg);
    } finally {
      setLoadingSubmit(false);
    }
  }

  return (
    <main className="h-screen overflow-y-auto scroll-smooth">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Book a Service</h1>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Pick a service, choose a date/time, and confirm your booking.
          </p>
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

        <div
          className="rounded-2xl border p-6 space-y-6"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          {pageLoading ? (
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Loading…
            </div>
          ) : (
            <form className="space-y-6" onSubmit={onSubmit}>
              {/* SERVICE PICKER */}
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="text-sm font-semibold">Service</label>
                  {selectedService ? (
                    <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Selected: <span className="font-semibold">{selectedService.title}</span>
                      <span className="ml-2">• {neededBlocks} hour(s)</span>
                    </div>
                  ) : null}
                </div>

                {/* Mobile dropdown */}
                <div className="sm:hidden">
                  <select
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                    value={servicePublicId}
                    onChange={(e) => setServicePublicId(e.target.value)}
                  >
                    {services.map((s) => (
                      <option key={s.public_id} value={s.public_id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desktop cards */}
                <div className="hidden sm:grid grid-cols-2 gap-3">
                  {services.map((s) => {
                    const active = s.public_id === servicePublicId;
                    const price = dollarsFromCents(s.base_price_cents);
                    const duration = s.duration_minutes ?? 60;
                    const hrs = Math.max(1, Math.ceil(duration / 60));

                    return (
                      <button
                        key={s.public_id}
                        type="button"
                        onClick={() => setServicePublicId(s.public_id)}
                        className={cn("text-left rounded-2xl border p-4 transition hover:opacity-95", active && "ring-2")}
                        style={{
                          borderColor: "rgb(var(--border))",
                          background: active ? "rgba(var(--bg), 0.45)" : "rgba(var(--bg), 0.30)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{s.title}</div>
                            <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                              {s.description}
                            </div>
                          </div>

                          {active ? (
                            <span
                              className="rounded-full border px-2 py-1 text-xs"
                              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                            >
                              Selected
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                          <span className="rounded-full border px-2 py-1" style={{ borderColor: "rgb(var(--border))" }}>
                            {hrs} hour(s)
                          </span>
                          {price ? (
                            <span className="rounded-full border px-2 py-1" style={{ borderColor: "rgb(var(--border))" }}>
                              ${price}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CALENDAR + TIMES (Calendly-style) */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Calendar */}
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
                      const disabled = isPastDate(c.ymd) || c.ymd > maxBookDateYmd;
                      const active = isSameYmd(c.ymd, selectedDateYmd);
                      const isToday = isSameYmd(c.ymd, todayYmd);

                      return (
                        <button
                          key={c.ymd}
                          type="button"
                          onClick={() => {
                            if (disabled) return;
                            setSelectedDateYmd(c.ymd);
                            setSelectedStartHour(null);
                            setPendingStartHour(null);
                          }}
                          disabled={disabled}
                          className={cn(
                            "rounded-xl border py-2 text-sm transition",
                            active && "ring-2",
                            disabled && "opacity-50 cursor-not-allowed"
                          )}
                          style={{
                            borderColor: "rgb(var(--border))",
                            background: active ? "rgba(var(--bg), 0.45)" : "rgba(var(--bg), 0.25)",
                          }}
                          title={
                            isPastDate(c.ymd)
                              ? "Past dates are not available"
                              : c.ymd > maxBookDateYmd
                              ? "Bookings are available up to 60 days out"
                              : c.ymd
                          }
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className={cn(!c.inMonth && "opacity-60")}>{c.date.getDate()}</span>
                            {isToday ? (
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ background: "rgb(59 130 246)" }}
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-xs" style={{ color: "rgb(var(--muted))" }}>
                    Selected:{" "}
                    <span className="font-semibold">
                      {formatSelectedHeader(selectedDateYmd, selectedStartHour, neededBlocks)}
                    </span>
                    {availLoading ? <span className="ml-2">• Checking availability…</span> : null}
                  </div>
                </div>

                {/* Times */}
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.15)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Available Times</div>
                      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        {formatSelectedHeader(selectedDateYmd, selectedStartHour, neededBlocks)}
                      </div>
                      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        1-hour blocks • Selects {neededBlocks} consecutive block(s)
                      </div>
                    </div>
                  </div>

                  {/* Wheel/scroll list */}
                  <div
                    className="mt-3 grid gap-2 overflow-y-auto pr-1"
                    style={{ maxHeight: "360px" }}
                    aria-label="Available time slots"
                  >
                    {hours.map((h) => {
                      const blocked = slotIsBlocked(selectedDateYmd, h);
                      const active = selectedStartHour === h;
                      const pending = pendingStartHour === h;

                      return (
                        <button
                          key={h}
                          type="button"
                          disabled={blocked}
                          onClick={() => setPendingStartHour(h)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-sm font-semibold text-left transition",
                            (active || pending) && "ring-2",
                            blocked && "opacity-50 cursor-not-allowed"
                          )}
                          style={{
                            borderColor: "rgb(var(--border))",
                            background: active
                              ? "rgba(var(--bg), 0.55)"
                              : pending
                              ? "rgba(var(--bg), 0.40)"
                              : "rgba(var(--bg), 0.25)",
                          }}
                          title={blocked ? "Unavailable" : "Select"}
                        >
                          {formatTimeLabel(h)}
                          {neededBlocks > 1 ? (
                            <span className="ml-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                              → {formatTimeLabel((h + neededBlocks) % 24)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {pendingStartHour !== null ? (
                    <div
                      className="mt-3 rounded-xl border p-3"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                    >
                      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                        Selected time
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {formatSelectedHeader(selectedDateYmd, pendingStartHour, neededBlocks)}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (slotIsBlocked(selectedDateYmd, pendingStartHour)) return;
                            setSelectedStartHour(pendingStartHour);
                            setPendingStartHour(null);
                          }}
                          className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                          disabled={slotIsBlocked(selectedDateYmd, pendingStartHour)}
                          title={slotIsBlocked(selectedDateYmd, pendingStartHour) ? "Unavailable" : "Confirm this time"}
                        >
                          Confirm time
                        </button>

                        <button
                          type="button"
                          onClick={() => setPendingStartHour(null)}
                          className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                          style={{ borderColor: "rgb(var(--border))", background: "transparent" }}
                        >
                          Cancel
                        </button>
                      </div>

                      {slotIsBlocked(selectedDateYmd, pendingStartHour) ? (
                        <div className="mt-2 text-xs" style={{ color: "rgb(239 68 68)" }}>
                          That slot just became unavailable. Please select a different time.
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3 text-xs" style={{ color: "rgb(var(--muted))" }}>
                    Reserved slots are automatically disabled.
                  </div>
                </div>
              </div>

              {/* RECURRING (UI-only for now; encoded into notes) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Recurring service</label>

                <div
                  className="rounded-xl border p-3 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={recurringEnabled}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setRecurringEnabled(on);
                        if (!on) {
                          setRecurringFreq("");
                          setRecurringCount(1);
                          setRecurringSameTime(true);
                        }
                      }}
                    />
                    I want this service to repeat
                  </label>

                  {recurringEnabled ? (
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                            Frequency
                          </div>
                          <select
                            value={recurringFreq}
                            onChange={(e) => setRecurringFreq(e.target.value as RecurrenceFreq)}
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                          >
                            <option value="">Select…</option>
                            <option value="biweekly">Every 2 weeks</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Every 3 months</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                            Repeat how many more times?
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={24}
                            value={recurringCount}
                            onChange={(e) => setRecurringCount(Math.max(1, Math.min(24, Number(e.target.value || 1))))}
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                          />
                          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                            (Example: 3 means total of 4 visits including this one)
                          </div>
                        </div>
                      </div>

                      <div
                        className="rounded-xl border p-3 text-sm"
                        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
                      >
                        <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                          Same day & time?
                        </div>

                        <label className="mt-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={recurringSameTime}
                            onChange={(e) => setRecurringSameTime(e.target.checked)}
                          />
                          Prefer the same day and time each visit
                        </label>

                        {!recurringSameTime ? (
                          <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                            For now, we’ll record your preference and coordinate alternative times after the first booking.
                          </div>
                        ) : null}
                      </div>

                      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Note: recurrence will be saved as a request for now (no auto-generated bookings yet).
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* ADDRESS */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <label className="text-sm font-semibold">Service address</label>
                </div>

                {/* Default address display */}
                <div
                  className="rounded-xl border p-3 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                >
                  <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                    Using your saved address
                  </div>
                  <div className="mt-1">
                    {defaultAddress ? defaultAddress : <span style={{ color: "rgb(239 68 68)" }}>No saved address</span>}
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useDifferentAddress}
                      onChange={(e) => setUseDifferentAddress(e.target.checked)}
                    />
                    Use a different address
                  </label>
                </div>

                {/* Different address input */}
                {useDifferentAddress ? (
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                    placeholder="Enter service address"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                  />
                ) : null}
              </div>

              {/* NOTES */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Notes (optional)</label>
                <textarea
                  className="w-full min-h-[110px] rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                  placeholder="Gate code, pets on-site, anything we should know…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                />
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  {notes.length}/2000
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", background: "transparent" }}
                  onClick={() => router.push("/account")}
                  disabled={loadingSubmit}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  disabled={loadingSubmit || selectedStartHour === null}
                  title={selectedStartHour === null ? "Select and confirm a time first" : "Confirm booking"}
                >
                  {loadingSubmit ? "Booking…" : "Confirm Booking"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ✅ Survey Modal */}
      <BookingSurveyModal
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        onSkip={() => router.push("/account")}
        heardFrom={surveyHeardFrom}
        setHeardFrom={setSurveyHeardFrom}
        referrerName={surveyReferrerName}
        setReferrerName={setSurveyReferrerName}
        otherText={surveyOtherText}
        setOtherText={setSurveyOtherText}
        submitting={surveySubmitting}
        onSubmit={onSubmitSurvey}
      />
    </main>
  );
}