"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  RotateCcw,
  StickyNote,
  User,
  UserPlus,
  Wrench,
} from "lucide-react";
import AddressAutocomplete from "../../../../components/AddressAutocomplete";
import { getServices, type Service } from "../../../../lib/api/services";
import { adminCreateBooking, getBookingAvailability, type AvailabilityBooking } from "../../../../lib/api/adminBookings";
import { me, type MeResponse } from "../../../../lib/api/auth";
import {
  adminSearchCustomersAndLeads,
  type AdminSearchRow,
  type SearchPersonKind,
} from "../../../../lib/api/adminCustomers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dollarsFromCents(cents?: number | null) {
  if (typeof cents !== "number") return null;
  return (cents / 100).toFixed(2);
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

  const dayLabel = base.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  if (startHour === null) return dayLabel;

  const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
  const end = new Date(start.getTime() + blocks * 60 * 60_000);

  const startLabel = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return `${dayLabel} • ${startLabel} – ${endLabel}`;
}

function localDateTimeToIsoFromParts(dateYmd: string, hour24: number) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, hour24, 0, 0, 0);
  return dt.toISOString();
}

function addMinutesIso(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountType = "" | "residential" | "business";

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

type BookingTargetMode = "existing" | "new";

type SelectedPerson =
  | { kind: "registered"; public_id: string }
  | { kind: "lead"; public_id: string }
  | null;

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-[rgb(var(--muted))]">{label}</div>
      {children}
    </div>
  );
}

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition";

const SELECT_CLS =
  "h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminLeadsPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [meRes, setMeRes] = useState<MeResponse | null>(null);

  const canUsePage = useMemo(() => isAdminOrSuperUser(meRes), [meRes]);

  // form state
  const [servicePublicId, setServicePublicId] = useState("");

  // Calendar/time selection
  const todayYmd = useMemo(() => ymdLocal(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(() => ymdLocal(new Date()));

  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
  const [pendingStartHour, setPendingStartHour] = useState<number | null>(null);

  // availability
  const [availLoading, setAvailLoading] = useState(false);
  const [availabilityOk, setAvailabilityOk] = useState(true);
  const [booked, setBooked] = useState<AvailabilityBooking[]>([]);

  // Address UX (existing customer only)
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [serviceAddress, setServiceAddress] = useState("");

  const [notes, setNotes] = useState("");

  // Target selection: existing vs new lead
  const [targetMode, setTargetMode] = useState<BookingTargetMode>("existing");

  // Existing customer selection
  const [custQ, setCustQ] = useState("");
  const [custLoading, setCustLoading] = useState(false);
  const [custRows, setCustRows] = useState<AdminSearchRow[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson>(null);

  const selectedRow = useMemo(() => {
    if (!selectedPerson) return null;
    return custRows.find((r) => r.public_id === selectedPerson.public_id && r.kind === selectedPerson.kind) || null;
  }, [custRows, selectedPerson]);

  const existingCustomerAddress = (selectedRow?.address || "").trim();

  // New customer (lead) form
  const [leadFirst, setLeadFirst] = useState("");
  const [leadLast, setLeadLast] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadType, setLeadType] = useState<AccountType>("");
  const [leadAddress, setLeadAddress] = useState("");

  const selectedService = useMemo(
    () => services.find((s) => s.public_id === servicePublicId) || null,
    [services, servicePublicId]
  );

  const durationMinutes = selectedService?.duration_minutes ?? 60;
  const neededBlocks = useMemo(() => blocksNeeded(durationMinutes), [durationMinutes]);
  const maxBookDateYmd = useMemo(() => ymdLocal(addDays(new Date(), 60)), []);
  const hours = useMemo(() => Array.from({ length: 14 }, (_, i) => i + 8), []);

  const finalAddress = useMemo(() => {
    if (targetMode === "new") return leadAddress.trim();
    return useDifferentAddress ? serviceAddress.trim() : existingCustomerAddress;
  }, [targetMode, leadAddress, useDifferentAddress, serviceAddress, existingCustomerAddress]);

  const startsAtIso = useMemo(() => {
    if (!selectedDateYmd) return null;
    if (selectedStartHour === null) return null;
    return localDateTimeToIsoFromParts(selectedDateYmd, selectedStartHour);
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

  // Load me + gate
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

    return () => { alive = false; };
  }, [router]);

  // Availability fetch when date changes
  useEffect(() => {
    let alive = true;
    (async () => {
      const tzOffsetMinutes = new Date().getTimezoneOffset();
      try {
        setAvailLoading(true);
        setAvailabilityOk(true);

        const res = await getBookingAvailability({ date: selectedDateYmd, tzOffsetMinutes });
        if (!alive) return;

        setBooked(res.bookings || []);
      } catch (e: unknown) {
        if (!alive) return;
        setBooked([]);
        setAvailabilityOk(false);
        const msg = e instanceof Error ? e.message : "Failed to load availability";
        setError(`Availability check failed: ${msg}. Please refresh or try again.`);
      } finally {
        if (alive) setAvailLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [selectedDateYmd]);

  // Clear time selection when service changes
  useEffect(() => {
    setSelectedStartHour(null);
    setPendingStartHour(null);
  }, [servicePublicId, neededBlocks]);

  // When target mode changes, reset relevant fields
  useEffect(() => {
    setError(null);
    setSelectedStartHour(null);
    setPendingStartHour(null);

    if (targetMode === "existing") {
      setUseDifferentAddress(false);
      setServiceAddress("");
    } else {
      setUseDifferentAddress(true);
      setServiceAddress("");
      setSelectedPerson(null);
      setCustRows([]);
      setCustQ("");
    }
  }, [targetMode]);

  const pageLoading = loadingServices || loadingMe;

  // Calendar grid
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
    if (startHour + neededBlocks > 24) return true;

    const [y, m, d] = dateYmd.split("-").map(Number);
    const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
    const end = new Date(start.getTime() + neededBlocks * 60 * 60_000);

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

  // ─── Customer search ───────────────────────────────────────────────────────

  const lastSearchId = useRef(0);
  const [custOpen, setCustOpen] = useState(false);

  async function loadCustomers(qOverride?: string) {
    const q = (qOverride ?? custQ).trim();

    const myId = ++lastSearchId.current;
    try {
      setCustLoading(true);
      setError(null);

      const res = await adminSearchCustomersAndLeads({ q, limit: 25 });
      if (myId !== lastSearchId.current) return;

      setCustRows(res.results || []);
    } catch (e: unknown) {
      if (myId !== lastSearchId.current) return;
      setError(e instanceof Error ? e.message : "Failed to load customers/leads");
      setCustRows([]);
    } finally {
      if (myId === lastSearchId.current) setCustLoading(false);
    }
  }

  // Debounce typing
  useEffect(() => {
    if (targetMode !== "existing") return;
    if (!custOpen) return;

    const t = window.setTimeout(() => {
      loadCustomers();
    }, 250);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custQ, custOpen, targetMode]);

  function resetForm() {
    setError(null);

    setTargetMode("existing");
    setCustQ("");
    setCustRows([]);
    setSelectedPerson(null);

    setLeadFirst("");
    setLeadLast("");
    setLeadEmail("");
    setLeadPhone("");
    setLeadType("");
    setLeadAddress("");

    setUseDifferentAddress(false);
    setServiceAddress("");

    setNotes("");

    setSelectedStartHour(null);
    setPendingStartHour(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canUsePage) return setError("Not authorized.");

    if (!servicePublicId) return setError("Please select a service.");
    if (!selectedDateYmd || selectedStartHour === null) return setError("Please select a date and time.");
    if (!startsAtIso || !computedEndsAtIso) return setError("Could not compute schedule.");

    if (!availabilityOk) return setError("Availability is unavailable right now. Please refresh and try again.");

    if (slotIsBlocked(selectedDateYmd, selectedStartHour)) {
      return setError("That time is no longer available. Please select another slot.");
    }

    if (targetMode === "existing") {
      if (!selectedPerson) return setError("Please select a customer or lead.");

      if (selectedPerson.kind === "registered") {
        if (!useDifferentAddress && existingCustomerAddress.length < 5) {
          return setError("This customer has no saved address. Use a different address.");
        }
        if (useDifferentAddress && serviceAddress.trim().length < 5) {
          return setError("Please enter a valid address (at least 5 characters).");
        }
      } else {
        if (!finalAddress || finalAddress.length < 5) {
          return setError("This lead has no saved address. Use a different address.");
        }
        if (useDifferentAddress && serviceAddress.trim().length < 5) {
          return setError("Please enter a valid address (at least 5 characters).");
        }
      }
    } else {
      if (leadEmail.trim().length < 5) return setError("Enter a valid email.");
      if (leadAddress.trim().length < 5) return setError("Enter a valid address (at least 5 characters).");
    }

    const finalNotes = notes.trim();

    try {
      setLoadingSubmit(true);

      const created =
        targetMode === "existing"
          ? selectedPerson?.kind === "registered"
            ? await adminCreateBooking({
                servicePublicId,
                startsAt: startsAtIso,
                endsAt: computedEndsAtIso,
                customerPublicId: selectedPerson.public_id,
                address: finalAddress,
                notes: finalNotes.trim() ? finalNotes.trim() : undefined,
              })
            : await adminCreateBooking({
                servicePublicId,
                startsAt: startsAtIso,
                endsAt: computedEndsAtIso,
                lead: {
                  email: (selectedRow?.email || "").trim(),
                  first_name: selectedRow?.first_name?.trim() || undefined,
                  last_name: selectedRow?.last_name?.trim() || undefined,
                  phone: selectedRow?.phone?.trim() || undefined,
                  account_type:
                    selectedRow?.kind === "lead" && selectedRow?.account_type
                      ? selectedRow.account_type
                      : undefined,
                  address: finalAddress,
                },
                address: finalAddress,
                notes: finalNotes.trim() ? finalNotes.trim() : undefined,
              })
          : await adminCreateBooking({
              servicePublicId,
              startsAt: startsAtIso,
              endsAt: computedEndsAtIso,
              lead: {
                email: leadEmail.trim(),
                first_name: leadFirst.trim() || undefined,
                last_name: leadLast.trim() || undefined,
                phone: leadPhone.trim() || undefined,
                account_type: leadType ? (leadType as "residential" | "business") : undefined,
                address: leadAddress.trim(),
              },
              address: finalAddress,
              notes: finalNotes.trim() ? finalNotes.trim() : undefined,
            });

      resetForm();
      toast.success("Booking created!", {
        description: created?.booking?.public_id
          ? `Booking ID: ${created.booking.public_id}`
          : "The booking has been added to the schedule.",
      });

      try {
        const tzOffsetMinutes = new Date().getTimezoneOffset();
        const res = await getBookingAvailability({ date: selectedDateYmd, tzOffsetMinutes });
        setBooked(res.bookings || []);
        setAvailabilityOk(true);
      } catch {}

      setSelectedStartHour(null);
      setPendingStartHour(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create booking";

      if (String(msg).toLowerCase().includes("time slot unavailable")) {
        setError("That time was just taken. Please pick another time slot.");

        try {
          const tzOffsetMinutes = new Date().getTimezoneOffset();
          const res = await getBookingAvailability({ date: selectedDateYmd, tzOffsetMinutes });
          setBooked(res.bookings || []);
          setAvailabilityOk(true);
        } catch {}

        setSelectedStartHour(null);
        setPendingStartHour(null);
        return;
      }

      setError(msg);
    } finally {
      setLoadingSubmit(false);
    }
  }

  function kindLabel(kind: SearchPersonKind) {
    return kind === "registered" ? "Registered" : "Lead";
  }

  function kindPillStyles(kind: SearchPersonKind) {
    if (kind === "registered") {
      return {
        borderColor: "rgba(34, 197, 94, 0.35)",
        background: "rgba(34, 197, 94, 0.10)",
        color: "rgb(134 239 172)",
      };
    }
    return {
      borderColor: "rgba(249, 115, 22, 0.35)",
      background: "rgba(249, 115, 22, 0.10)",
      color: "rgb(253 186 116)",
    };
  }

  function displayName(r: AdminSearchRow) {
    const name = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
    return name || r.email;
  }

  const disableTimeSlots = !availabilityOk || availLoading;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Admin Booking</h2>
          <p className="text-sm text-[rgb(var(--muted))]">
            Create bookings for existing customers or new leads.
          </p>
        </div>

        <button
          type="button"
          onClick={resetForm}
          disabled={loadingSubmit}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* Banners */}
      <AnimatePresence>
        {error ? (
          <motion.div
            key="error"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        ) : null}

      </AnimatePresence>

      {pageLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        </div>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>

          {/* ── Service Picker ── */}
          <SectionCard
            icon={<Wrench className="h-4 w-4" />}
            title="Service"
            subtitle="Choose the service type for this booking"
            accentClass="bg-sky-500/10 text-sky-400"
            complete={servicePublicId !== ""}
          >
            {/* Mobile dropdown */}
            <div className="sm:hidden">
              <select
                className={SELECT_CLS}
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-[rgb(var(--fg))] truncate">{s.title}</div>
                        {s.description ? (
                          <div className="mt-0.5 text-xs text-[rgb(var(--muted))] line-clamp-2">{s.description}</div>
                        ) : null}
                      </div>
                      {active ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs text-[rgb(var(--muted))]">
                        <Clock className="h-3 w-3" />
                        {hrs}h
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

          {/* ── Customer ── */}
          <SectionCard
            icon={<User className="h-4 w-4" />}
            title="Customer"
            subtitle="Book for an existing account or create a new lead"
            accentClass="bg-indigo-500/10 text-indigo-400"
            complete={(targetMode === "existing" && selectedPerson !== null) || (targetMode === "new" && leadEmail.trim().length >= 5 && leadAddress.trim().length >= 5)}
          >
            {/* Mode tabs */}
            <div className="mb-4 flex gap-2">
              {(
                [
                  ["existing", "Existing customer", User],
                  ["new", "New lead", UserPlus],
                ] as const
              ).map(([key, label, Icon]) => {
                const active = targetMode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTargetMode(key)}
                    className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition"
                    style={{
                      borderColor: active ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.08)",
                      background: active ? "rgba(99,102,241,0.10)" : "rgba(255,255,255,0.02)",
                      color: active ? "rgb(165,180,252)" : "rgb(var(--muted))",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {targetMode === "existing" ? (
                <motion.div
                  key="existing"
                  initial={shouldReduceMotion ? undefined : { opacity: 0 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3"
                >
                  <div className="flex gap-2">
                    <input
                      value={custQ}
                      onChange={(e) => setCustQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); loadCustomers(); }
                      }}
                      onFocus={() => {
                        setCustOpen(true);
                        if (custRows.length === 0) loadCustomers("");
                      }}
                      placeholder="Search name, email, phone…"
                      className={INPUT_CLS + " flex-1"}
                    />
                    <button
                      type="button"
                      onClick={() => { setCustOpen(true); loadCustomers(); }}
                      disabled={custLoading}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.07] disabled:opacity-60"
                    >
                      {custLoading ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : null}
                      {custLoading ? "Searching…" : "Search"}
                    </button>
                  </div>

                  {/* Results */}
                  <div
                    className="grid gap-2 overflow-y-auto pr-1"
                    style={{ maxHeight: "calc(4 * 84px + 12px)" }}
                  >
                    {custRows.length > 0 ? (
                      custRows.map((r) => {
                        const active =
                          !!selectedPerson &&
                          selectedPerson.public_id === r.public_id &&
                          selectedPerson.kind === r.kind;

                        return (
                          <button
                            key={`${r.kind}:${r.public_id}`}
                            type="button"
                            onClick={() => setSelectedPerson({ kind: r.kind, public_id: r.public_id })}
                            className="flex items-start gap-3 rounded-2xl border p-3 text-left transition hover:bg-white/[0.04]"
                            style={{
                              borderColor: active ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.08)",
                              background: active ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                            }}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-[rgb(var(--muted))]">
                              {(displayName(r)[0] || "?").toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[rgb(var(--fg))] truncate">
                                  {displayName(r)}
                                </span>
                                <span
                                  className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                                  style={kindPillStyles(r.kind)}
                                >
                                  {kindLabel(r.kind)}
                                </span>
                              </div>
                              <div className="text-xs text-[rgb(var(--muted))] truncate">
                                {r.email}{r.phone ? ` • ${r.phone}` : ""}
                              </div>
                              {r.address ? (
                                <div className="mt-0.5 flex items-center gap-1 text-xs text-[rgb(var(--muted))] truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {r.address}
                                </div>
                              ) : null}
                            </div>

                            {active ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-[rgb(var(--muted))]">
                        {custLoading ? "Searching…" : "Start typing or click Search to find customers."}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="new"
                  initial={shouldReduceMotion ? undefined : { opacity: 0 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="First name">
                      <input value={leadFirst} onChange={(e) => setLeadFirst(e.target.value)} className={INPUT_CLS} />
                    </Field>

                    <Field label="Last name">
                      <input value={leadLast} onChange={(e) => setLeadLast(e.target.value)} className={INPUT_CLS} />
                    </Field>

                    <Field label="Email *">
                      <input
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        className={INPUT_CLS}
                        placeholder="customer@email.com"
                        type="email"
                      />
                    </Field>

                    <Field label="Phone">
                      <input
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        className={INPUT_CLS}
                        placeholder="702-555-1234"
                        type="tel"
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Account type">
                        <select
                          value={leadType}
                          onChange={(e) => setLeadType((e.target.value as AccountType) ?? "")}
                          className={SELECT_CLS}
                        >
                          <option value="">Select…</option>
                          <option value="residential">Residential</option>
                          <option value="business">Business</option>
                        </select>
                      </Field>
                    </div>

                    <div className="sm:col-span-2">
                      <Field label="Address *">
                        <AddressAutocomplete
                          value={leadAddress}
                          onChange={setLeadAddress}
                          className={INPUT_CLS}
                          placeholder="Street, City, State"
                        />
                      </Field>
                    </div>
                  </div>

                  <p className="text-xs text-[rgb(var(--muted))]">
                    This creates an unregistered lead. Once they register, their bookings will be promoted to their account.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* ── Schedule ── */}
          <SectionCard
            icon={<CalendarDays className="h-4 w-4" />}
            title="Schedule"
            subtitle={
              selectedStartHour !== null
                ? formatSelectedHeader(selectedDateYmd, selectedStartHour, neededBlocks)
                : "Select a date and time"
            }
            accentClass="bg-violet-500/10 text-violet-400"
            complete={selectedStartHour !== null}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Calendar */}
              <div className="lg:col-span-2">
                {/* Month nav */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[rgb(var(--fg))]">
                    {formatMonthYear(monthCursor)}
                  </span>
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

                {/* Day headers */}
                <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-[rgb(var(--muted))]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                    <div key={w} className="py-1">{w}</div>
                  ))}
                </div>

                {/* Date cells */}
                <div className="grid grid-cols-7 gap-1">
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
                          background: active
                            ? "rgb(var(--primary))"
                            : "transparent",
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
                          <span
                            className="mt-0.5 h-1 w-1 rounded-full"
                            style={{ background: "rgb(var(--primary))" }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {/* Status line */}
                <div className="mt-3 text-xs text-[rgb(var(--muted))]">
                  {availLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Checking availability…
                    </span>
                  ) : !availabilityOk ? (
                    <span className="text-red-400">Availability unavailable — please refresh.</span>
                  ) : (
                    <span>Bookings available up to 60 days out.</span>
                  )}
                </div>
              </div>

              {/* Time slots */}
              <div className="flex flex-col">
                <div className="mb-2">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">Available Times</div>
                  <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                    Selects {neededBlocks} consecutive hour block{neededBlocks > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="grid gap-1 overflow-y-auto pr-1" style={{ maxHeight: "340px" }}>
                  {hours.map((h) => {
                    const blocked = slotIsBlocked(selectedDateYmd, h);
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
                          borderColor:
                            active
                              ? "rgba(139,92,246,0.5)"
                              : pending
                              ? "rgba(139,92,246,0.3)"
                              : blocked || disableTimeSlots
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(255,255,255,0.08)",
                          background:
                            active
                              ? "rgba(139,92,246,0.15)"
                              : pending
                              ? "rgba(139,92,246,0.08)"
                              : "rgba(255,255,255,0.02)",
                          color:
                            blocked || disableTimeSlots
                              ? "rgb(var(--muted))"
                              : "rgb(var(--fg))",
                          cursor: blocked || disableTimeSlots ? "not-allowed" : "pointer",
                          opacity: blocked || disableTimeSlots ? 0.45 : 1,
                        }}
                      >
                        <span>{formatTimeLabel(h)}</span>
                        {neededBlocks > 1 ? (
                          <span className="text-xs text-[rgb(var(--muted))]">
                            → {formatTimeLabel((h + neededBlocks) % 24)}
                          </span>
                        ) : null}
                        {active ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-400" /> : null}
                      </button>
                    );
                  })}
                </div>

                {/* Pending confirm */}
                <AnimatePresence>
                  {pendingStartHour !== null ? (
                    <motion.div
                      initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                      animate={shouldReduceMotion ? undefined : { opacity: 1, height: "auto" }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3">
                        <div className="text-xs font-semibold text-[rgb(var(--muted))]">Confirm time?</div>
                        <div className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                          {formatSelectedHeader(selectedDateYmd, pendingStartHour, neededBlocks)}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (disableTimeSlots) return;
                              if (slotIsBlocked(selectedDateYmd, pendingStartHour)) return;
                              setSelectedStartHour(pendingStartHour);
                              setPendingStartHour(null);
                            }}
                            disabled={disableTimeSlots || slotIsBlocked(selectedDateYmd, pendingStartHour)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-violet-500/20 px-3 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/30 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingStartHour(null)}
                            className="inline-flex h-8 items-center rounded-xl border border-white/10 px-3 text-xs font-medium text-[rgb(var(--muted))] transition hover:bg-white/[0.05]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                  Reserved slots are automatically disabled.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* ── Service Address (existing mode only) ── */}
          <AnimatePresence>
            {targetMode === "existing" ? (
              <motion.div
                key="address-card"
                initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, height: "auto" }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <SectionCard
                  icon={<MapPin className="h-4 w-4" />}
                  title="Service Address"
                  subtitle="Where should we go?"
                  accentClass="bg-amber-500/10 text-amber-400"
                  complete={finalAddress.length >= 5}
                >
                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="text-xs font-semibold text-[rgb(var(--muted))]">Saved address</div>
                      <div className="mt-1 text-sm text-[rgb(var(--fg))]">
                        {existingCustomerAddress ? (
                          existingCustomerAddress
                        ) : (
                          <span className="text-red-400">No saved address — use a different address below.</span>
                        )}
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[rgb(var(--fg))]">
                      <input
                        type="checkbox"
                        checked={useDifferentAddress}
                        onChange={(e) => setUseDifferentAddress(e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      Use a different address
                    </label>

                    <AnimatePresence>
                      {useDifferentAddress ? (
                        <motion.div
                          initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                          animate={shouldReduceMotion ? undefined : { opacity: 1, height: "auto" }}
                          exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <AddressAutocomplete
                            className={INPUT_CLS}
                            placeholder="Enter service address"
                            value={serviceAddress}
                            onChange={setServiceAddress}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </SectionCard>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* ── Notes ── */}
          <SectionCard
            icon={<StickyNote className="h-4 w-4" />}
            title="Notes"
            subtitle="Optional — gate codes, pets, special instructions"
            accentClass="bg-zinc-500/10 text-zinc-400"
          >
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition"
              placeholder="Gate code, pets on-site, anything we should know…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
            />
            <div className="mt-1.5 text-right text-xs text-[rgb(var(--muted))]">{notes.length}/2000</div>
          </SectionCard>

          {/* ── Booking Summary Strip ── */}
          <AnimatePresence>
            {selectedStartHour !== null && servicePublicId ? (
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
                  {services.find((s) => s.public_id === servicePublicId) ? (
                    <div>
                      <div className="text-xs font-semibold text-[rgb(var(--muted))]">Service</div>
                      <div className="text-sm font-medium text-[rgb(var(--fg))]">
                        {services.find((s) => s.public_id === servicePublicId)!.title}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-xs font-semibold text-[rgb(var(--muted))]">Date & Time</div>
                    <div className="text-sm font-medium text-[rgb(var(--fg))]">
                      {formatSelectedHeader(selectedDateYmd, selectedStartHour, neededBlocks)}
                    </div>
                  </div>
                  {finalAddress ? (
                    <div>
                      <div className="text-xs font-semibold text-[rgb(var(--muted))]">Address</div>
                      <div className="text-sm font-medium text-[rgb(var(--fg))]">{finalAddress}</div>
                    </div>
                  ) : null}
                  {selectedPerson || (targetMode === "new" && leadEmail.trim()) ? (
                    <div>
                      <div className="text-xs font-semibold text-[rgb(var(--muted))]">Customer</div>
                      <div className="text-sm font-medium text-[rgb(var(--fg))]">
                        {targetMode === "new"
                          ? [leadFirst.trim(), leadLast.trim()].filter(Boolean).join(" ") || leadEmail.trim()
                          : custRows.find((r) => selectedPerson && r.public_id === selectedPerson.public_id)
                            ? [
                                custRows.find((r) => selectedPerson && r.public_id === selectedPerson.public_id)!.first_name,
                                custRows.find((r) => selectedPerson && r.public_id === selectedPerson.public_id)!.last_name,
                              ]
                              .filter(Boolean)
                              .join(" ") ||
                              custRows.find((r) => selectedPerson && r.public_id === selectedPerson.public_id)!.email
                            : ""}
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* ── Submit ── */}
          <div className="flex items-center justify-end gap-3 pt-1">
            {selectedStartHour === null ? (
              <span className="text-xs text-[rgb(var(--muted))]">Select and confirm a time to submit</span>
            ) : null}
            <motion.button
              type="submit"
              disabled={loadingSubmit || selectedStartHour === null}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.01, y: -1 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-6 text-sm font-semibold text-[rgb(var(--primary-fg))] shadow-lg shadow-black/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSubmit ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Booking…
                </>
              ) : (
                <>
                  <Briefcase className="h-4 w-4" />
                  Create Booking
                </>
              )}
            </motion.button>
          </div>
        </form>
      )}
    </div>
  );
}
