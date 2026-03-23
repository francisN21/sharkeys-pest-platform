"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  FileText,
  MapPin,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import { getServices, type Service } from "../../lib/api/services";
import { createBooking, getBookingAvailability, type AvailabilityBooking } from "../../lib/api/bookings";
import { me, type MeResponse } from "../../lib/api/auth";
import BookingSurveyModal from "../../components/BookingSurveyModal";
import { surveyNeeded, submitSurvey, type SurveyCode } from "../../lib/api/survey";

// --- Helpers ---

function dollarsFromCents(cents?: number | null) {
  if (typeof cents !== "number") return null;
  return (cents / 100).toFixed(2);
}

function localDateTimeToIsoFromParts(dateYmd: string, timeHHmm: string) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const [hh, mm] = timeHHmm.split(":").map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
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

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function blocksNeeded(durationMinutes: number) {
  return Math.max(1, Math.ceil(durationMinutes / 60));
}

function formatSelectedHeader(dateYmd: string, startHour: number | null, blocks: number) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const base = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayLabel = base.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  if (startHour === null) return dayLabel;
  const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
  const end = new Date(start.getTime() + blocks * 60 * 60_000);
  const startLabel = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dayLabel} • ${startLabel} – ${endLabel}`;
}

// --- UI Components ---

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="shrink-0 rounded-xl border p-2 shadow-sm"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--card))",
        }}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {subtitle ? (
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const INPUT_CLS =
  "w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2";

// --- Main Page ---

export default function BookPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [servicePublicId, setServicePublicId] = useState("");

  const todayYmd = useMemo(() => ymdLocal(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(() => todayYmd);
  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
  const [pendingStartHour, setPendingStartHour] = useState<number | null>(null);

  const [availLoading, setAvailLoading] = useState(false);
  const [booked, setBooked] = useState<AvailabilityBooking[]>([]);

  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [serviceAddress, setServiceAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [createdBookingPublicId, setCreatedBookingPublicId] = useState<string | null>(null);
  const [surveyHeardFrom, setSurveyHeardFrom] = useState<SurveyCode | "">("");
  const [surveyReferrerName, setSurveyReferrerName] = useState("");
  const [surveyOtherText, setSurveyOtherText] = useState("");

  const timeListRef = useRef<HTMLDivElement>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.public_id === servicePublicId) || null,
    [services, servicePublicId]
  );

  const durationMinutes = selectedService?.duration_minutes ?? 60;
  const neededBlocks = useMemo(() => blocksNeeded(durationMinutes), [durationMinutes]);
  const maxBookDateYmd = useMemo(() => ymdLocal(addDays(new Date(), 60)), []);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const defaultAddress = (user?.address || "").trim();

  const finalAddress = useMemo(() => {
    return useDifferentAddress ? serviceAddress.trim() : defaultAddress;
  }, [useDifferentAddress, serviceAddress, defaultAddress]);

  const startsAtIso = useMemo(() => {
    if (!selectedDateYmd || selectedStartHour === null) return null;
    return localDateTimeToIsoFromParts(selectedDateYmd, `${pad2(selectedStartHour)}:00`);
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
        if (!servicePublicId && list.length) setServicePublicId(list[0].public_id);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load services");
      } finally {
        if (alive) setLoadingServices(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load current user (auth check + address prefill)
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
    return () => { alive = false; };
  }, [router]);

  // Load availability for selected date
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
    return () => { alive = false; };
  }, [selectedDateYmd]);

  // Scroll time list to 8 AM when date changes
  useEffect(() => {
    if (!timeListRef.current) return;
    timeListRef.current.scrollTop = 8 * 44;
  }, [selectedDateYmd]);

  // Clear time selection when service changes
  useEffect(() => {
    setSelectedStartHour(null);
    setPendingStartHour(null);
  }, [servicePublicId, neededBlocks]);

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

  const bookedIntervals = useMemo(
    () => booked.map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) })),
    [booked]
  );

  function isPastDate(ymd: string) {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return date < today0;
  }

  function slotIsBlocked(dateYmd: string, startHour: number) {
    const [y, m, d] = dateYmd.split("-").map(Number);
    const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
    const end = new Date(start.getTime() + neededBlocks * 60 * 60_000);
    if (startHour + neededBlocks > 24) return true;
    for (const it of bookedIntervals) {
      if (overlaps(start, end, it.start, it.end)) return true;
    }
    const today = ymdLocal(new Date());
    if (isSameYmd(dateYmd, today)) {
      const now = new Date();
      if (start <= now) return true;
    }
    return false;
  }

  async function openSurveyIfNeeded() {
    try {
      const r = await surveyNeeded();
      if (r?.ok && r.needed) setSurveyOpen(true);
      else router.push("/account");
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
    if (surveyHeardFrom === "referral" && surveyReferrerName.trim().length < 2) {
      setError("Please enter a name (at least 2 characters).");
      return;
    }

    try {
      setSurveySubmitting(true);
      setError(null);
      await submitSurvey({
        bookingPublicId: createdBookingPublicId ?? undefined,
        heard_from: surveyHeardFrom,
        referrer_name:
          surveyHeardFrom === "referral" ? surveyReferrerName.trim() : undefined,
        other_text:
          surveyHeardFrom === "other" ? surveyOtherText.trim() : undefined,
      });
      setSurveyOpen(false);
      router.push("/account");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit survey");
    } finally {
      setSurveySubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);

    if (!servicePublicId) return setError("Please select a service.");
    if (!selectedDateYmd || selectedStartHour === null) {
      return setError("Please select a date and time.");
    }
    if (!startsAtIso || !computedEndsAtIso) return setError("Could not compute schedule.");

    if (!useDifferentAddress) {
      if (defaultAddress.length < 5) {
        return setError("Your account has no saved address. Please use a different address.");
      }
    } else {
      if (serviceAddress.trim().length < 5) {
        return setError("Please enter a valid address (at least 5 characters).");
      }
    }

    if (slotIsBlocked(selectedDateYmd, selectedStartHour)) {
      return setError("That time is no longer available. Please select another slot.");
    }

    try {
      setLoadingSubmit(true);
      const created = await createBooking({
        servicePublicId,
        startsAt: startsAtIso,
        endsAt: computedEndsAtIso,
        address: finalAddress,
        notes: notes.trim() || undefined,
      });
      const bookingPid = created?.booking?.public_id ?? null;
      setCreatedBookingPublicId(bookingPid);
      setSuccessMsg("Booking created!");
      await openSurveyIfNeeded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create booking");
    } finally {
      setLoadingSubmit(false);
    }
  }

  const pageLoading = loadingServices || loadingMe;

  return (
    <main className="min-h-screen overflow-y-auto scroll-smooth">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-10">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Book a Service</h1>
            <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Pick a service, choose a date and time, and confirm your booking.
            </p>
          </div>

          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: "rgb(239 68 68)" }}
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {successMsg ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: "rgb(34 197 94)" }}
              >
                {successMsg}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            className="rounded-2xl border p-6 shadow-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            {pageLoading ? (
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: "rgb(var(--muted))" }}
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading…
              </div>
            ) : (
              <form className="space-y-6" onSubmit={onSubmit}>
                {/* Service picker */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(var(--bg), 0.28)",
                  }}
                >
                  <SectionHeader
                    icon={<FileText className="h-4 w-4" />}
                    title="Select a Service"
                    subtitle="Choose the type of pest control service you need"
                  />

                  {/* Mobile dropdown */}
                  <div className="sm:hidden">
                    <select
                      className={INPUT_CLS}
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgba(var(--bg), 0.35)",
                      }}
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
                      const hrs = Math.max(1, Math.ceil((s.duration_minutes ?? 60) / 60));
                      return (
                        <button
                          key={s.public_id}
                          type="button"
                          onClick={() => setServicePublicId(s.public_id)}
                          className={cn(
                            "text-left rounded-2xl border p-4 transition hover:opacity-95",
                            active && "ring-2"
                          )}
                          style={{
                            borderColor: "rgb(var(--border))",
                            background: active
                              ? "rgba(var(--bg), 0.45)"
                              : "rgba(var(--bg), 0.22)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{s.title}</div>
                              <div
                                className="mt-1 text-sm"
                                style={{ color: "rgb(var(--muted))" }}
                              >
                                {s.description}
                              </div>
                            </div>
                            {active ? (
                              <span
                                className="shrink-0 rounded-full border px-2 py-1 text-xs"
                                style={{
                                  borderColor: "rgb(var(--border))",
                                  background: "rgba(var(--bg), 0.35)",
                                }}
                              >
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <div
                            className="mt-3 flex items-center gap-2 text-xs"
                            style={{ color: "rgb(var(--muted))" }}
                          >
                            <span
                              className="rounded-full border px-2 py-1"
                              style={{ borderColor: "rgb(var(--border))" }}
                            >
                              {hrs} hr{hrs !== 1 ? "s" : ""}
                            </span>
                            {price ? (
                              <span
                                className="rounded-full border px-2 py-1"
                                style={{ borderColor: "rgb(var(--border))" }}
                              >
                                ${price}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar + Time */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(var(--bg), 0.28)",
                  }}
                >
                  <SectionHeader
                    icon={<CalendarDays className="h-4 w-4" />}
                    title="Pick a Date & Time"
                    subtitle="Select an available slot for your service"
                  />
                  <div className="grid gap-4 lg:grid-cols-3">
                    {/* Calendar */}
                    <div
                      className="rounded-2xl border p-4 lg:col-span-2"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgba(var(--bg), 0.15)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">
                          {formatMonthYear(monthCursor)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition"
                            style={{
                              borderColor: "rgb(var(--border))",
                              background: "rgba(var(--bg), 0.25)",
                            }}
                            onClick={() => setMonthCursor((d) => addMonths(d, -1))}
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition"
                            style={{
                              borderColor: "rgb(var(--border))",
                              background: "rgba(var(--bg), 0.25)",
                            }}
                            onClick={() => setMonthCursor((d) => addMonths(d, 1))}
                          >
                            ›
                          </button>
                        </div>
                      </div>

                      <div
                        className="mt-4 grid grid-cols-7 gap-1 text-xs"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
                          <div key={w} className="text-center font-semibold py-1">
                            {w}
                          </div>
                        ))}
                      </div>

                      <div className="mt-1 grid grid-cols-7 gap-1">
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
                                disabled && "opacity-40 cursor-not-allowed"
                              )}
                              style={{
                                borderColor: "rgb(var(--border))",
                                background: active
                                  ? "rgba(var(--bg), 0.55)"
                                  : "rgba(var(--bg), 0.20)",
                              }}
                              title={
                                isPastDate(c.ymd)
                                  ? "Past date"
                                  : c.ymd > maxBookDateYmd
                                    ? "Bookings available up to 60 days out"
                                    : undefined
                              }
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span className={cn(!c.inMonth && "opacity-50")}>
                                  {c.date.getDate()}
                                </span>
                                {isToday ? (
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ background: "rgb(59 130 246)" }}
                                  />
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        <span className="font-medium">
                          {formatSelectedHeader(selectedDateYmd, selectedStartHour, neededBlocks)}
                        </span>
                        {availLoading ? (
                          <span className="ml-2 opacity-70">• Checking availability…</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Time slots */}
                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgba(var(--bg), 0.15)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Clock
                          className="h-4 w-4 shrink-0"
                          style={{ color: "rgb(var(--muted))" }}
                        />
                        <div>
                          <div className="text-sm font-semibold">Available Times</div>
                          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                            {neededBlocks} hour block
                          </div>
                        </div>
                      </div>

                      <div
                        ref={timeListRef}
                        className="grid gap-1.5 overflow-y-auto pr-1"
                        style={{ maxHeight: "300px" }}
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
                                "w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                                (active || pending) && "ring-2",
                                blocked && "opacity-40 cursor-not-allowed"
                              )}
                              style={{
                                borderColor: "rgb(var(--border))",
                                background: active
                                  ? "rgba(var(--bg), 0.55)"
                                  : pending
                                    ? "rgba(var(--bg), 0.40)"
                                    : "rgba(var(--bg), 0.22)",
                              }}
                              title={blocked ? "Unavailable" : undefined}
                            >
                              {formatTimeLabel(h)}
                              {neededBlocks > 1 ? (
                                <span
                                  className="ml-2 text-xs"
                                  style={{ color: "rgb(var(--muted))" }}
                                >
                                  → {formatTimeLabel((h + neededBlocks) % 24)}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      <AnimatePresence>
                        {pendingStartHour !== null ? (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            className="mt-3 rounded-xl border p-3"
                            style={{
                              borderColor: "rgb(var(--border))",
                              background: "rgba(var(--bg), 0.25)",
                            }}
                          >
                            <div
                              className="text-xs font-semibold"
                              style={{ color: "rgb(var(--muted))" }}
                            >
                              Confirm this time?
                            </div>
                            <div className="mt-1 text-sm font-semibold">
                              {formatSelectedHeader(
                                selectedDateYmd,
                                pendingStartHour,
                                neededBlocks
                              )}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (slotIsBlocked(selectedDateYmd, pendingStartHour)) return;
                                  setSelectedStartHour(pendingStartHour);
                                  setPendingStartHour(null);
                                }}
                                className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
                                style={{
                                  borderColor: "rgb(var(--border))",
                                  background: "rgb(var(--card))",
                                }}
                                disabled={slotIsBlocked(selectedDateYmd, pendingStartHour)}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingStartHour(null)}
                                className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition"
                                style={{
                                  borderColor: "rgb(var(--border))",
                                  background: "transparent",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                            {slotIsBlocked(selectedDateYmd, pendingStartHour) ? (
                              <div className="mt-2 text-xs" style={{ color: "rgb(239 68 68)" }}>
                                That slot just became unavailable. Select a different time.
                              </div>
                            ) : null}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Reserved slots are disabled automatically.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(var(--bg), 0.28)",
                  }}
                >
                  <SectionHeader
                    icon={<MapPin className="h-4 w-4" />}
                    title="Service Address"
                    subtitle="Where we're coming"
                  />
                  <div
                    className="rounded-xl border p-3 text-sm"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgba(var(--bg), 0.22)",
                    }}
                  >
                    <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                      Saved address
                    </div>
                    <div className="mt-1">
                      {defaultAddress ? (
                        defaultAddress
                      ) : (
                        <span style={{ color: "rgb(239 68 68)" }}>No saved address</span>
                      )}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useDifferentAddress}
                        onChange={(e) => setUseDifferentAddress(e.target.checked)}
                      />
                      Use a different address
                    </label>
                  </div>
                  {useDifferentAddress ? (
                    <input
                      className={cn(INPUT_CLS, "mt-3")}
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgba(var(--bg), 0.35)",
                      }}
                      placeholder="Enter service address"
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                    />
                  ) : null}
                </div>

                {/* Notes */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(var(--bg), 0.28)",
                  }}
                >
                  <SectionHeader
                    icon={<FileText className="h-4 w-4" />}
                    title="Notes"
                    subtitle="Optional details to help our technician"
                  />
                  <textarea
                    className={cn(INPUT_CLS, "min-h-[100px] resize-none")}
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgba(var(--bg), 0.35)",
                    }}
                    placeholder="Gate code, pets on-site, anything we should know…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={2000}
                  />
                  <div className="mt-1 text-xs text-right" style={{ color: "rgb(var(--muted))" }}>
                    {notes.length}/2000
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                    style={{ borderColor: "rgb(var(--border))", background: "transparent" }}
                    onClick={() => router.push("/account")}
                    disabled={loadingSubmit}
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loadingSubmit || selectedStartHour === null}
                    whileHover={
                      !loadingSubmit && selectedStartHour !== null ? { scale: 1.01, y: -1 } : {}
                    }
                    whileTap={
                      !loadingSubmit && selectedStartHour !== null ? { scale: 0.99 } : {}
                    }
                    className="rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                    style={{
                      background: "rgb(var(--primary))",
                      color: "rgb(var(--primary-fg))",
                    }}
                    title={
                      selectedStartHour === null ? "Select and confirm a time first" : undefined
                    }
                  >
                    {loadingSubmit ? "Booking…" : "Confirm Booking"}
                  </motion.button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </section>

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
