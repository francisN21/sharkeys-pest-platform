"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "../../components/Navbar";
import { getServices, type Service } from "../../lib/api/services";
import { createBooking, getBookingAvailability, type AvailabilityBooking } from "../../lib/api/bookings";
import { me, type MeResponse } from "../../lib/api/auth";
import BookingSurveyModal from "../../components/BookingSurveyModal";
import { surveyNeeded, submitSurvey, type SurveyCode } from "../../lib/api/survey";
import AddressAutocomplete from "../../components/AddressAutocomplete";

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

function SectionCard({
  icon,
  title,
  subtitle,
  accentClass = "bg-sky-500/10 text-sky-400",
  complete = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  accentClass?: string;
  complete?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[rgb(var(--fg))]">{title}</div>
          {subtitle ? <div className="text-xs text-[rgb(var(--muted))]">{subtitle}</div> : null}
        </div>
        {complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition";

// --- Main Page ---

export default function BookPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [error, setError] = useState<string | null>(null);

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
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => (i + 8) % 24), []);

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
      toast.success("Booking created!", {
        description: "Your appointment has been scheduled successfully.",
      });
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
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
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
                <SectionCard
                  icon={<FileText className="h-5 w-5" />}
                  title="Service"
                  subtitle="Choose the service type for this booking"
                  accentClass="bg-sky-500/10 text-sky-400"
                  complete={!!servicePublicId}
                >

                  {/* Mobile dropdown */}
                  <div className="sm:hidden">
                    <select
                      className={INPUT_CLS}
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
                          className="group relative flex flex-col rounded-2xl border p-4 text-left transition hover:bg-white/[0.04]"
                          style={{
                            borderColor: active ? "rgba(56,189,248,0.45)" : "rgba(255,255,255,0.08)",
                            background: active ? "rgba(14,165,233,0.08)" : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{s.title}</div>
                              <div className="mt-1 text-xs text-[rgb(var(--muted))] line-clamp-2">
                                {s.description}
                              </div>
                            </div>
                            {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" /> : null}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs text-[rgb(var(--muted))]">
                              <Clock className="h-3 w-3" />
                              {hrs} hr{hrs !== 1 ? "s" : ""}
                            </span>
                            {price ? (
                              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs text-[rgb(var(--muted))]">
                                ${price}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>

                {/* Calendar + Time */}
                <SectionCard
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Schedule"
                  subtitle={selectedStartHour !== null ? formatSelectedHeader(selectedDateYmd, selectedStartHour, neededBlocks) : "Select a date and time"}
                  accentClass="bg-orange-500/10 text-orange-400"
                  complete={selectedStartHour !== null}
                >
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
                            onClick={() => setMonthCursor((d) => addMonths(d, -1))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgb(var(--muted))] transition hover:bg-white/[0.07]"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonthCursor((d) => addMonths(d, 1))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[rgb(var(--muted))] transition hover:bg-white/[0.07]"
                          >
                            <ChevronRight className="h-4 w-4" />
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
                              className="flex flex-col items-center justify-center rounded-xl py-2 text-sm transition"
                              style={{
                                background: active ? "rgb(var(--primary))" : "transparent",
                                color: active
                                  ? "rgb(var(--primary-fg))"
                                  : disabled
                                  ? "rgba(var(--muted), 0.4)"
                                  : c.inMonth
                                  ? "rgb(var(--fg))"
                                  : "rgb(var(--muted))",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.4 : 1,
                              }}
                              title={
                                isPastDate(c.ymd)
                                  ? "Past dates are not available"
                                  : c.ymd > maxBookDateYmd
                                  ? "Bookings are available up to 60 days out"
                                  : c.ymd
                              }
                            >
                              <span>{c.date.getDate()}</span>
                              {isToday && !active ? (
                                <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: "rgb(var(--primary))" }} />
                              ) : null}
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
                              className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition"
                              style={{
                                borderColor: active
                                  ? "rgba(139,92,246,0.5)"
                                  : pending
                                  ? "rgba(139,92,246,0.3)"
                                  : blocked
                                  ? "rgba(255,255,255,0.05)"
                                  : "rgba(255,255,255,0.08)",
                                background: active
                                  ? "rgba(139,92,246,0.15)"
                                  : pending
                                  ? "rgba(139,92,246,0.08)"
                                  : "rgba(255,255,255,0.02)",
                                color: blocked ? "rgb(var(--muted))" : "rgb(var(--fg))",
                                cursor: blocked ? "not-allowed" : "pointer",
                                opacity: blocked ? 0.45 : 1,
                              }}
                            >
                              <span>{formatTimeLabel(h)}</span>
                              {neededBlocks > 1 ? (
                                <span className="text-xs text-[rgb(var(--muted))]">→ {formatTimeLabel((h + neededBlocks) % 24)}</span>
                              ) : null}
                              {active ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-400" /> : null}
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
                </SectionCard>

                {/* Address */}
                <SectionCard
                  icon={<MapPin className="h-5 w-5" />}
                  title="Service Address"
                  subtitle="Where should we go?"
                  accentClass="bg-emerald-500/10 text-emerald-400"
                  complete={finalAddress.length >= 5}
                >
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
                    <AddressAutocomplete
                      className={cn(INPUT_CLS, "mt-3")}
                      placeholder="Enter service address"
                      value={serviceAddress}
                      onChange={setServiceAddress}
                    />
                  ) : null}
                </SectionCard>

                {/* Notes */}
                <SectionCard
                  icon={<FileText className="h-5 w-5" />}
                  title="Notes"
                  subtitle="Optional — gate codes, pets, special instructions"
                  accentClass="bg-violet-500/10 text-violet-400"
                  complete={notes.trim().length > 0}
                >
                  <textarea
                    className={cn(INPUT_CLS, "min-h-[100px] resize-none")}
                    placeholder="Gate code, pets on-site, anything we should know…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={2000}
                  />
                  <div className="mt-1 text-xs text-right" style={{ color: "rgb(var(--muted))" }}>
                    {notes.length}/2000
                  </div>
                </SectionCard>

                {/* Booking summary strip */}
                <AnimatePresence>
                  {selectedStartHour !== null && selectedService ? (
                    <motion.div
                      key="summary"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden rounded-2xl border"
                      style={{
                        borderColor: "rgba(34,197,94,0.3)",
                        background: "rgba(34,197,94,0.05)",
                      }}
                    >
                      <div
                        className="flex items-center gap-2 border-b px-5 py-3"
                        style={{ borderColor: "rgba(34,197,94,0.2)" }}
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        <span className="text-sm font-semibold text-green-500">Booking Summary</span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-3 px-5 py-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>Service</div>
                          <div className="text-sm font-medium">{selectedService.title}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>Date & Time</div>
                          <div className="text-sm font-medium">{formatSelectedHeader(selectedDateYmd, selectedStartHour, neededBlocks)}</div>
                        </div>
                        {finalAddress ? (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>Address</div>
                            <div className="text-sm font-medium">{finalAddress}</div>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
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
                    >
                      {loadingSubmit ? "Booking…" : "Confirm Booking"}
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {selectedStartHour === null ? (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        Select and confirm a date &amp; time to continue
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
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
