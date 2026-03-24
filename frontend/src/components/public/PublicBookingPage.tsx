"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  StickyNote,
  User2,
} from "lucide-react";
import { me as apiMe } from "../../lib/api/auth";
import Navbar from "../../components/Navbar";
import { getServices, type Service } from "../../lib/api/services";
import {
  getBookingAvailability,
  type AvailabilityBooking,
} from "../../lib/api/bookings";
import { createGuestBooking, submitPublicSurvey } from "../../lib/api/publicBookings";
import BookingSurveyModal from "../../components/BookingSurveyModal";
import type { SurveyCode } from "../../lib/api/survey";
import AddressAutocomplete from "../../components/AddressAutocomplete";

// --- Types ---

type PublicBookingPageProps = {
  lockedServiceTitle: string;
  pageTitle: string;
  pageDescription: string;
  backHref?: string;
  backLabel?: string;
};

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

function formatSelectedHeader(
  dateYmd: string,
  startHour: number | null,
  blocks: number
) {
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
  const startLabel = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endLabel = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dayLabel} • ${startLabel} – ${endLabel}`;
}

function redirectAuthenticatedUserByRole(
  router: ReturnType<typeof useRouter>,
  userRole?: string | null
) {
  if (userRole === "customer") {
    router.replace("/book");
    return true;
  }
  if (userRole === "superuser" || userRole === "admin") {
    router.replace("/account/admin/leads");
    return true;
  }
  if (userRole === "technician" || userRole === "worker") {
    router.replace("/account/technician");
    return true;
  }
  return false;
}

// --- UI Components ---

function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 py-10", className)}>
      {children}
    </div>
  );
}

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

// --- Main Component ---

export default function PublicBookingPage({
  lockedServiceTitle,
  pageTitle,
  pageDescription,
  backHref = "/",
  backLabel = "Back to Home",
}: PublicBookingPageProps) {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [servicePublicId, setServicePublicId] = useState("");

  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [createdBookingPublicId, setCreatedBookingPublicId] = useState<string | null>(null);
  const [surveyHeardFrom, setSurveyHeardFrom] = useState<SurveyCode | "">("");
  const [surveyReferrerName, setSurveyReferrerName] = useState("");
  const [surveyOtherText, setSurveyOtherText] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [notes, setNotes] = useState("");

  const todayYmd = useMemo(() => ymdLocal(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(() => todayYmd);
  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
  const [pendingStartHour, setPendingStartHour] = useState<number | null>(null);

  const [availLoading, setAvailLoading] = useState(false);
  const [booked, setBooked] = useState<AvailabilityBooking[]>([]);

  const timeListRef = useRef<HTMLDivElement>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.public_id === servicePublicId) || null,
    [services, servicePublicId]
  );

  const durationMinutes = selectedService?.duration_minutes ?? 60;
  const neededBlocks = useMemo(() => blocksNeeded(durationMinutes), [durationMinutes]);
  const maxBookDateYmd = useMemo(() => ymdLocal(addDays(new Date(), 60)), []);
  const hours = useMemo(() => Array.from({ length: 14 }, (_, i) => i + 8), []);

  const startsAtIso = useMemo(() => {
    if (!selectedDateYmd || selectedStartHour === null) return null;
    return localDateTimeToIsoFromParts(selectedDateYmd, `${pad2(selectedStartHour)}:00`);
  }, [selectedDateYmd, selectedStartHour]);

  const computedEndsAtIso = useMemo(() => {
    if (!startsAtIso) return null;
    return addMinutesIso(startsAtIso, durationMinutes);
  }, [startsAtIso, durationMinutes]);

  const lockedServicePrice = dollarsFromCents(selectedService?.base_price_cents);

  // Auth check: redirect authenticated users away from public booking
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiMe();
        if (!alive) return;
        const redirected = redirectAuthenticatedUserByRole(
          router,
          res.user?.user_role ?? null
        );
        if (redirected) return;
      } catch {
        // Not authenticated — stay on this page
      } finally {
        if (alive) setAuthChecking(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  // Load services and lock to the specified one
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
        const lockedService =
          list.find(
            (s) => s.title.trim().toLowerCase() === lockedServiceTitle.trim().toLowerCase()
          ) || null;
        if (!lockedService) {
          setError(`"${lockedServiceTitle}" service was not found.`);
          setServicePublicId("");
          return;
        }
        setServicePublicId(lockedService.public_id);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load services");
      } finally {
        if (alive) setLoadingServices(false);
      }
    })();
    return () => { alive = false; };
  }, [lockedServiceTitle]);

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

  // Clear time selection when service duration changes
  useEffect(() => {
    setSelectedStartHour(null);
    setPendingStartHour(null);
  }, [neededBlocks, servicePublicId]);

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

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setServiceAddress("");
    setNotes("");
    setSelectedStartHour(null);
    setPendingStartHour(null);
    setSelectedDateYmd(todayYmd);
    setMonthCursor(startOfMonth(new Date()));
    const lockedService =
      services.find(
        (s) => s.title.trim().toLowerCase() === lockedServiceTitle.trim().toLowerCase()
      ) || null;
    setServicePublicId(lockedService?.public_id ?? "");
  }

  function handleStartAnotherBooking() {
    setError(null);
    setBookingComplete(false);
    setSurveyOpen(false);
    setSurveyHeardFrom("");
    setSurveyReferrerName("");
    setSurveyOtherText("");
    setCreatedBookingPublicId(null);
    resetForm();
  }

  async function onSubmitSurvey() {
    if (!surveyHeardFrom || !createdBookingPublicId) return;
    try {
      setSurveySubmitting(true);
      await submitPublicSurvey({
        bookingPublicId: createdBookingPublicId,
        heard_from: surveyHeardFrom,
        referrer_name: surveyHeardFrom === "referral" ? surveyReferrerName.trim() : undefined,
        other_text: surveyHeardFrom === "other" ? surveyOtherText.trim() : undefined,
      });
    } catch {
      // Survey errors are non-critical — silently dismiss
    } finally {
      setSurveySubmitting(false);
      setSurveyOpen(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) return setError("Please enter your first name.");
    if (!lastName.trim()) return setError("Please enter your last name.");
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email.");
    if (serviceAddress.trim().length < 5) {
      return setError("Please enter a valid address (at least 5 characters).");
    }
    if (notes.trim().length < 5) {
      return setError("Please enter a description (at least 5 characters).");
    }
    if (!servicePublicId) return setError(`${lockedServiceTitle} service is unavailable.`);
    if (!selectedDateYmd || selectedStartHour === null) {
      return setError("Please select a date and time.");
    }
    if (!startsAtIso || !computedEndsAtIso) return setError("Could not compute schedule.");
    if (slotIsBlocked(selectedDateYmd, selectedStartHour)) {
      return setError("That time is no longer available. Please select another slot.");
    }

    try {
      setLoadingSubmit(true);
      const result = await createGuestBooking({
        servicePublicId,
        startsAt: startsAtIso,
        endsAt: computedEndsAtIso,
        address: serviceAddress.trim(),
        notes: notes.trim(),
        lead: {
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          address: serviceAddress.trim(),
        },
      });
      const pid = result?.booking?.public_id ?? null;
      setCreatedBookingPublicId(pid);
      resetForm();
      setBookingComplete(true);
      toast.success("Booking request submitted!", {
        description: "We'll review your request and be in touch shortly.",
      });
      setSurveyOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create booking");
    } finally {
      setLoadingSubmit(false);
    }
  }

  if (authChecking) {
    return (
      <main className="min-h-screen overflow-y-auto">
        <Navbar />
        <PageContainer>
          <div
            className="rounded-2xl border p-6 shadow-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>Loading…</div>
          </div>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-y-auto scroll-smooth">
      <Navbar />
      <PageContainer>
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Page header */}
          <div className="space-y-4">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition hover:opacity-90"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
                color: "rgb(var(--fg))",
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </Link>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{pageTitle}</h1>
              <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                {pageDescription}
              </p>
            </div>
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
            {loadingServices ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading…
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {bookingComplete ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex min-h-[420px] flex-col items-center justify-center space-y-4 text-center"
                  >
                    <div className="rounded-full p-4" style={{ background: "rgba(34, 197, 94, 0.10)" }}>
                      <CheckCircle2 className="h-10 w-10" style={{ color: "rgb(34 197 94)" }} />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h2 className="text-2xl font-semibold">Booking request submitted!</h2>
                      <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                        Your request has been received. Here&apos;s what happens next:
                      </p>
                    </div>
                    <div className="w-full max-w-md space-y-4 text-left">
                      {[
                        {
                          n: "1",
                          title: "We review your request",
                          desc: "Our team reviews your booking details within 1 business day.",
                        },
                        {
                          n: "2",
                          title: "Account setup email",
                          desc: "You'll receive an email to complete your customer account.",
                        },
                        {
                          n: "3",
                          title: "Service confirmation",
                          desc: "Once confirmed, you'll get a reminder before your appointment.",
                        },
                      ].map((s) => (
                        <div key={s.n} className="flex items-start gap-3">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                            style={{ borderColor: "rgb(var(--border))" }}
                          >
                            {s.n}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{s.title}</div>
                            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                              {s.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleStartAnotherBooking}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                        style={{
                          borderColor: "rgb(var(--border))",
                          background: "rgb(var(--card))",
                        }}
                      >
                        Create another booking
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push("/login")}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                        style={{ borderColor: "rgb(var(--border))", background: "transparent" }}
                      >
                        Back to sign in
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    className="space-y-6"
                    onSubmit={onSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Locked service display */}
                    <SectionCard
                      icon={<FileText className="h-5 w-5" />}
                      title="Service"
                      subtitle="Choose the service type for this booking"
                      accentClass="bg-sky-500/10 text-sky-400"
                      complete={!!selectedService}
                    >
                      {selectedService ? (
                        <div
                          className="rounded-2xl border p-4"
                          style={{
                            borderColor: "rgb(var(--border))",
                            background: "rgba(var(--bg), 0.22)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold sm:text-base">
                                {selectedService.title}
                              </div>
                              <div
                                className="mt-1 text-xs sm:text-sm"
                                style={{ color: "rgb(var(--muted))" }}
                              >
                                {selectedService.description}
                              </div>
                            </div>
                            <span
                              className="shrink-0 rounded-full border px-2 py-1 text-[11px] sm:text-xs"
                              style={{
                                borderColor: "rgb(var(--border))",
                                background: "rgba(var(--bg), 0.35)",
                              }}
                            >
                              Selected
                            </span>
                          </div>
                          {lockedServicePrice ? (
                            <div
                              className="mt-3 text-[11px] sm:text-xs"
                              style={{ color: "rgb(var(--muted))" }}
                            >
                              <span
                                className="rounded-full border px-2 py-1"
                                style={{ borderColor: "rgb(var(--border))" }}
                              >
                                ${lockedServicePrice}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div
                          className="rounded-xl border p-3 text-sm"
                          style={{ borderColor: "rgb(239 68 68)" }}
                        >
                          {lockedServiceTitle} service is currently unavailable.
                        </div>
                      )}
                    </SectionCard>

                    {/* Contact info */}
                    <SectionCard
                      icon={<User2 className="h-5 w-5" />}
                      title="Contact Information"
                      subtitle="Tell us who you are"
                      accentClass="bg-violet-500/10 text-violet-400"
                      complete={!!(firstName.trim() && lastName.trim() && email.trim() && email.includes("@"))}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="First name *">
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={INPUT_CLS}
                          />
                        </Field>
                        <Field label="Last name *">
                          <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={INPUT_CLS}
                          />
                        </Field>
                        <Field label="Email *">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className={INPUT_CLS}
                          />
                        </Field>
                        <Field label="Phone">
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="702-555-1234"
                            className={INPUT_CLS}
                          />
                        </Field>
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
                              const disableTimeSlots = false;
                              const active = selectedStartHour === h;
                              const pending = pendingStartHour === h;
                              return (
                                <button
                                  key={h}
                                  type="button"
                                  disabled={blocked || disableTimeSlots}
                                  onClick={() => setPendingStartHour(h)}
                                  className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition"
                                  style={{
                                    borderColor: active
                                      ? "rgba(139,92,246,0.5)"
                                      : pending
                                      ? "rgba(139,92,246,0.3)"
                                      : blocked || disableTimeSlots
                                      ? "rgba(255,255,255,0.05)"
                                      : "rgba(255,255,255,0.08)",
                                    background: active
                                      ? "rgba(139,92,246,0.15)"
                                      : pending
                                      ? "rgba(139,92,246,0.08)"
                                      : "rgba(255,255,255,0.02)",
                                    color: blocked || disableTimeSlots ? "rgb(var(--muted))" : "rgb(var(--fg))",
                                    cursor: blocked || disableTimeSlots ? "not-allowed" : "pointer",
                                    opacity: blocked || disableTimeSlots ? 0.45 : 1,
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
                              </motion.div>
                            ) : null}
                          </AnimatePresence>

                          <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                            Reserved slots are disabled automatically.
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    {/* Service address */}
                    <SectionCard
                      icon={<MapPin className="h-4 w-4" />}
                      title="Service Address"
                      subtitle="Where should we go?"
                      accentClass="bg-emerald-500/10 text-emerald-400"
                      complete={serviceAddress.trim().length >= 5}
                    >
                      <Field label="Service address *">
                        <AddressAutocomplete
                          value={serviceAddress}
                          onChange={setServiceAddress}
                          placeholder="123 Main St, San Jose, CA 95101"
                          className={INPUT_CLS}
                        />
                      </Field>
                    </SectionCard>

                    {/* Notes */}
                    <SectionCard
                      icon={<StickyNote className="h-4 w-4" />}
                      title="Notes"
                      subtitle="Optional — gate codes, pets, special instructions"
                      accentClass="bg-zinc-500/10 text-zinc-400"
                      complete={notes.trim().length >= 5}
                    >
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Gate code, pets on-site, anything we should know…"
                        className={cn(INPUT_CLS, "min-h-[100px] resize-none")}
                        maxLength={2000}
                      />
                      <div className="mt-1.5 text-right text-xs text-[rgb(var(--muted))]">{notes.length}/2000</div>
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
                            {serviceAddress.trim() ? (
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>Address</div>
                                <div className="text-sm font-medium">{serviceAddress.trim()}</div>
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    {/* Submit */}
                    <div className="flex flex-col items-end gap-2">
                      <motion.button
                        type="submit"
                        disabled={loadingSubmit || selectedStartHour === null}
                        whileHover={
                          !loadingSubmit && selectedStartHour !== null
                            ? { scale: 1.01, y: -1 }
                            : {}
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
                        {loadingSubmit ? "Submitting…" : "Request Booking"}
                      </motion.button>
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
                  </motion.form>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.section>
      </PageContainer>

      <BookingSurveyModal
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        onSkip={() => setSurveyOpen(false)}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-[rgb(var(--muted))]">
        {label}
      </div>
      {children}
    </div>
  );
}
