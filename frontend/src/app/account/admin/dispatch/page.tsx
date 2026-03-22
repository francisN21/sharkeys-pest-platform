"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Phone,
  Square,
  User,
  Wrench,
  X,
} from "lucide-react";
import {
  adminAcceptBooking,
  adminCancelBooking,
  getAdminBookings,
  type AdminBookingRow,
  adminListTechnicians,
  adminAssignBooking,
  type TechnicianRow,
} from "../../../../lib/api/adminBookings";
import AdminModal from "../_components/AdminModal";
import UndoToast, { type UndoToastState } from "../_components/UndoToast";
import { usePolling } from "../_components/usePolling";
import ReassignTechModal from "../../techbookings/components/ReassignTechModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;

  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

function formatCreated(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function formatNotes(notes: string | null) {
  const n = (notes ?? "").trim();
  return n.length ? n : null;
}

type PersonKind = "lead" | "registered";

function getKind(b: AdminBookingRow): PersonKind {
  return b.lead_public_id ? "lead" : "registered";
}

function formatAccountTypeLabel(v?: string | null) {
  if (!v) return "—";
  const s = v.trim().toLowerCase();
  if (s === "residential") return "Residential";
  if (s === "business") return "Business";
  return v;
}

function getBookee(b: AdminBookingRow) {
  const first = b.bookee_first_name ?? b.customer_first_name ?? b.lead_first_name ?? null;
  const last = b.bookee_last_name ?? b.customer_last_name ?? b.lead_last_name ?? null;
  const email = b.bookee_email ?? b.customer_email ?? b.lead_email ?? "";
  const phone = b.bookee_phone ?? b.customer_phone ?? b.lead_phone ?? null;
  const accountType = b.bookee_account_type ?? b.customer_account_type ?? b.lead_account_type ?? null;
  const customerAddress = b.customer_address ?? null;
  const name = [first, last].filter(Boolean).join(" ").trim();
  return {
    first,
    last,
    email,
    phone,
    accountType,
    customerAddress,
    displayName: name.length ? name : email || "—",
  };
}

// ─── Pills ─────────────────────────────────────────────────────────────────────

function KindPill({ kind }: { kind: PersonKind }) {
  const isLead = kind === "lead";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{
        borderColor: isLead ? "rgba(245,158,11,0.40)" : "rgba(255,255,255,0.12)",
        background: isLead ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.05)",
        color: isLead ? "rgb(253 230 138)" : "rgb(var(--muted))",
      }}
    >
      {isLead ? "Lead" : "Registered"}
    </span>
  );
}

function StatusBadge({ label, color }: { label: string; color: "amber" | "sky" | "slate" }) {
  const styles = {
    amber: {
      border: "rgba(245,158,11,0.35)",
      bg: "rgba(245,158,11,0.12)",
      text: "rgb(253 230 138)",
    },
    sky: {
      border: "rgba(56,189,248,0.35)",
      bg: "rgba(56,189,248,0.12)",
      text: "rgb(186 230 253)",
    },
    slate: {
      border: "rgba(148,163,184,0.28)",
      bg: "rgba(148,163,184,0.10)",
      text: "rgb(226 232 240)",
    },
  }[color];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize"
      style={{ borderColor: styles.border, background: styles.bg, color: styles.text }}
    >
      {label}
    </span>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function BookingDispatchCard({
  booking,
  busy,
  kind,
  bookee,
  notes,
  statusColor,
  selectable,
  selected,
  onSelect,
  footer,
}: {
  booking: AdminBookingRow;
  busy: boolean;
  kind: PersonKind;
  bookee: ReturnType<typeof getBookee>;
  notes: string | null;
  statusColor: "amber" | "sky";
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  footer: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const accentColor = statusColor === "amber" ? "rgba(245,158,11,0.25)" : "rgba(56,189,248,0.25)";
  const gradientColor =
    statusColor === "amber"
      ? "linear-gradient(to right, rgba(245,158,11,0.08), transparent)"
      : "linear-gradient(to right, rgba(56,189,248,0.08), transparent)";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border transition-all"
      style={{
        borderColor: selected ? accentColor : "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {/* Top gradient strip */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: accentColor }} />
      <div className="absolute inset-x-0 top-0 h-16" style={{ background: gradientColor }} />

      <div className="relative p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {selectable ? (
            <button
              type="button"
              onClick={onSelect}
              className="mt-0.5 shrink-0 text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))]"
              aria-label={selected ? "Deselect booking" : "Select booking"}
            >
              {selected ? (
                <CheckCircle2 className="h-5 w-5 text-sky-400" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
          ) : null}

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
            <ClipboardList className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                {booking.service_title}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <KindPill kind={kind} />
                <StatusBadge
                  label={booking.status}
                  color={booking.status === "pending" ? "amber" : "sky"}
                />
              </div>
            </div>

            <div className="mt-2 grid gap-1.5">
              <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {bookee.displayName}
                  {bookee.accountType ? ` · ${formatAccountTypeLabel(bookee.accountType)}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formatRange(booking.starts_at, booking.ends_at)}</span>
              </div>
              {(booking.address || bookee.customerAddress) ? (
                <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{booking.address || bookee.customerAddress}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Expanded section */}
        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, height: "auto" }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Phone
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm">
                    <Phone className="h-3 w-3 text-[rgb(var(--muted))]" />
                    {bookee.phone || "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Email
                  </div>
                  <div className="mt-1 break-all text-sm">{bookee.email || "—"}</div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 sm:col-span-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Address
                  </div>
                  <div className="mt-1 text-sm">
                    {booking.address || bookee.customerAddress || "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Booking ID
                  </div>
                  <div className="mt-1 break-all font-mono text-xs text-[rgb(var(--muted))]">
                    {booking.public_id}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Created
                  </div>
                  <div className="mt-1 text-sm">{formatCreated(booking.created_at)}</div>
                </div>
              </div>

              {notes ? (
                <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Customer Notes
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-sm">{notes}</div>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-[rgb(var(--muted))] transition hover:bg-white/[0.06] hover:text-[rgb(var(--fg))] sm:w-auto"
            aria-expanded={expanded}
          >
            {expanded ? "Show less ↑" : "Show details ↓"}
          </button>

          <div className={busy ? "pointer-events-none opacity-60" : ""}>{footer}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  count,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-[rgb(var(--fg))]">{title}</h3>
            {count !== undefined ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[11px] font-bold text-[rgb(var(--muted))]">
                {count}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDispatchPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [pendingRows, setPendingRows] = useState<AdminBookingRow[]>([]);
  const [acceptedRows, setAcceptedRows] = useState<AdminBookingRow[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"created" | "scheduled">("created");

  const [techs, setTechs] = useState<TechnicianRow[]>([]);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"accept" | "cancel">("accept");
  const [modalBookingId, setModalBookingId] = useState<string | null>(null);
  const [modalBookingTitle, setModalBookingTitle] = useState<string | null>(null);

  // Assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignBooking, setAssignBooking] = useState<{
    publicId: string;
    title: string;
    startsAt: string;
    endsAt: string;
    customerName: string;
  } | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);

  // Undo toast
  const [undoToast, setUndoToast] = useState<UndoToastState>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk select (pending only)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [p, a] = await Promise.all([
      getAdminBookings("pending"),
      getAdminBookings("accepted"),
    ]);
    setPendingRows(p.bookings || []);
    setAcceptedRows(a.bookings || []);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [t] = await Promise.all([adminListTechnicians()]);
        if (!alive) return;
        setTechs(t.technicians || []);
        await refresh();
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load jobs");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [refresh]);

  // Auto-refresh every 30 seconds
  usePolling(refresh, 30_000, !loading);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // ─── Sort ───────────────────────────────────────────────────────────────────

  const sortedPending = useMemo(() => {
    const copy = [...pendingRows];
    copy.sort((a, b) => {
      const aKey = sortBy === "created" ? a.created_at : a.starts_at;
      const bKey = sortBy === "created" ? b.created_at : b.starts_at;
      return new Date(bKey).getTime() - new Date(aKey).getTime();
    });
    return copy;
  }, [pendingRows, sortBy]);

  const sortedAccepted = useMemo(() => {
    const copy = [...acceptedRows];
    copy.sort((a, b) => {
      const aKey = sortBy === "created" ? a.created_at : a.starts_at;
      const bKey = sortBy === "created" ? b.created_at : b.starts_at;
      return new Date(bKey).getTime() - new Date(aKey).getTime();
    });
    return copy;
  }, [acceptedRows, sortBy]);

  // ─── Modal helpers ───────────────────────────────────────────────────────────

  function findBookingTitle(publicId: string) {
    return (
      [...pendingRows, ...acceptedRows].find((x) => x.public_id === publicId)?.service_title ?? null
    );
  }

  function openAcceptModal(publicId: string) {
    setModalKind("accept");
    setModalBookingId(publicId);
    setModalBookingTitle(findBookingTitle(publicId));
    setModalOpen(true);
  }

  function openCancelModal(publicId: string) {
    setModalKind("cancel");
    setModalBookingId(publicId);
    setModalBookingTitle(findBookingTitle(publicId));
    setModalOpen(true);
  }

  function closeModal() {
    if (modalBookingId && busyId === modalBookingId) return;
    setModalOpen(false);
    setModalBookingId(null);
    setModalBookingTitle(null);
  }

  async function confirmModalAction() {
    if (!modalBookingId) return;

    const bookingId = modalBookingId;

    if (modalKind === "accept") {
      try {
        setBusyId(bookingId);
        setErr(null);
        await adminAcceptBooking(bookingId);
        await refresh();
        closeModal();
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to accept booking");
      } finally {
        setBusyId(null);
      }
    } else {
      // Optimistic cancel + undo toast
      const removedFromPending = pendingRows.find((b) => b.public_id === bookingId) ?? null;
      const removedFromAccepted = acceptedRows.find((b) => b.public_id === bookingId) ?? null;

      setPendingRows((prev) => prev.filter((b) => b.public_id !== bookingId));
      setAcceptedRows((prev) => prev.filter((b) => b.public_id !== bookingId));
      setBulkSelected((prev) => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
      closeModal();

      // Clear any existing undo timer
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

      const restoreBooking = () => {
        if (removedFromPending) setPendingRows((prev) => [removedFromPending, ...prev]);
        if (removedFromAccepted) setAcceptedRows((prev) => [removedFromAccepted, ...prev]);
      };

      const toastId = Date.now().toString();

      setUndoToast({
        id: toastId,
        message: `Booking "${modalBookingTitle ?? bookingId}" cancelled`,
        onUndo: restoreBooking,
      });

      undoTimerRef.current = setTimeout(async () => {
        setUndoToast(null);
        try {
          setBusyId(bookingId);
          await adminCancelBooking(bookingId);
          await refresh();
        } catch (e: unknown) {
          setErr(e instanceof Error ? e.message : "Failed to cancel booking");
          restoreBooking();
        } finally {
          setBusyId(null);
        }
      }, 5000);
    }
  }

  // ─── Assign ──────────────────────────────────────────────────────────────────

  function openAssignModal(booking: AdminBookingRow) {
    const bookee = getBookee(booking);
    setAssignBooking({
      publicId: booking.public_id,
      title: booking.service_title,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      customerName: bookee.displayName,
    });
    setAssignModalOpen(true);
  }

  async function onAssign(workerUserId: number) {
    if (!assignBooking) return;
    try {
      setAssignBusy(true);
      await adminAssignBooking(assignBooking.publicId, workerUserId);
      await refresh();
      setAssignModalOpen(false);
      setAssignBooking(null);
    } catch (e: unknown) {
      throw e; // let ReassignTechModal surface the error
    } finally {
      setAssignBusy(false);
    }
  }

  // ─── Bulk accept ─────────────────────────────────────────────────────────────

  function toggleBulkSelect(publicId: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  function selectAllPending() {
    setBulkSelected(new Set(sortedPending.map((b) => b.public_id)));
  }

  function clearBulkSelect() {
    setBulkSelected(new Set());
  }

  async function bulkAccept() {
    if (bulkSelected.size === 0) return;
    const ids = Array.from(bulkSelected);
    setBulkSelected(new Set());
    try {
      setBulkBusy(true);
      setErr(null);
      await Promise.all(ids.map((id) => adminAcceptBooking(id)));
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to bulk accept bookings");
    } finally {
      setBulkBusy(false);
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const modalBusy = !!modalBookingId && busyId === modalBookingId;

  const technicianOptions = useMemo(
    () =>
      techs.map((t) => ({
        user_id: t.id,
        public_id: t.public_id,
        first_name: t.first_name,
        last_name: t.last_name,
        email: t.email,
        phone: t.phone,
      })),
    [techs]
  );

  const allPendingSelected =
    sortedPending.length > 0 && sortedPending.every((b) => bulkSelected.has(b.public_id));

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <UndoToast
        toast={undoToast}
        onDismiss={() => setUndoToast(null)}
      />

      {/* Accept confirm modal */}
      <AdminModal
        open={modalOpen && modalKind === "accept"}
        onClose={closeModal}
        disabled={modalBusy}
        title="Accept this booking?"
        subtitle="This will move the booking to Accepted so it can be assigned to a technician."
        icon={<CheckCircle2 className="h-6 w-6" />}
        accentFrom="rgba(34,197,94,0.10)"
        accentVia="rgba(16,185,129,0.08)"
        accentTo="rgba(6,182,212,0.06)"
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              disabled={modalBusy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              Cancel
            </button>
            <motion.button
              type="button"
              onClick={confirmModalAction}
              disabled={modalBusy}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {modalBusy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Accepting…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Accept Booking
                </>
              )}
            </motion.button>
          </>
        }
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
          <div className="font-medium text-[rgb(var(--fg))]">
            {modalBookingTitle ?? "—"}
          </div>
          <div className="mt-1 font-mono text-xs text-[rgb(var(--muted))]">
            {modalBookingId ?? "—"}
          </div>
        </div>
      </AdminModal>

      {/* Cancel confirm modal */}
      <AdminModal
        open={modalOpen && modalKind === "cancel"}
        onClose={closeModal}
        disabled={modalBusy}
        title="Cancel this booking?"
        subtitle="The booking will be marked as cancelled. You'll have 5 seconds to undo."
        icon={<X className="h-6 w-6" />}
        accentFrom="rgba(239,68,68,0.10)"
        accentVia="rgba(220,38,38,0.08)"
        accentTo="rgba(239,68,68,0.05)"
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              disabled={modalBusy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              Keep Booking
            </button>
            <motion.button
              type="button"
              onClick={confirmModalAction}
              disabled={modalBusy}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500/80 px-5 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-red-500 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Cancel Booking
            </motion.button>
          </>
        }
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
          <div className="font-medium text-[rgb(var(--fg))]">{modalBookingTitle ?? "—"}</div>
          <div className="mt-1 font-mono text-xs text-[rgb(var(--muted))]">
            {modalBookingId ?? "—"}
          </div>
        </div>
      </AdminModal>

      {/* Assign modal */}
      <ReassignTechModal
        open={assignModalOpen}
        onClose={() => {
          if (!assignBusy) {
            setAssignModalOpen(false);
            setAssignBooking(null);
          }
        }}
        onSubmit={onAssign}
        bookingPublicId={assignBooking?.publicId ?? null}
        technicians={technicianOptions}
        currentWorkerId={null}
        customerName={assignBooking?.customerName}
        serviceName={assignBooking?.title}
        startsAt={assignBooking?.startsAt}
        endsAt={assignBooking?.endsAt}
        submitting={assignBusy}
      />

      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[rgb(var(--fg))]">Dispatch</h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Review new bookings and assign them to technicians. Auto-refreshes every 30s.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[rgb(var(--muted))]">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value === "scheduled" ? "scheduled" : "created")}
                className="rounded-xl border border-white/10 bg-[rgb(var(--card))] px-3 py-2 text-sm focus:outline-none"
              >
                <option value="created">Created</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading || !!busyId || bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[rgb(var(--card))] px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {err ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              <span>{err}</span>
              <button
                type="button"
                onClick={() => setErr(null)}
                className="ml-3 text-red-300/70 hover:text-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/08 bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading jobs…
          </div>
        ) : null}

        {/* ── Pending ── */}
        {!loading ? (
          <Section
            title="Pending"
            subtitle="New bookings waiting for review."
            count={sortedPending.length}
            actions={
              bulkSelected.size > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[rgb(var(--muted))]">
                    {bulkSelected.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={clearBulkSelect}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium transition hover:bg-white/[0.06]"
                  >
                    Clear
                  </button>
                  <motion.button
                    type="button"
                    onClick={bulkAccept}
                    disabled={bulkBusy}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-60"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {bulkBusy ? "Accepting…" : `Accept ${bulkSelected.size}`}
                  </motion.button>
                </div>
              ) : sortedPending.length > 1 ? (
                <button
                  type="button"
                  onClick={selectAllPending}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--muted))] transition hover:bg-white/[0.06] hover:text-[rgb(var(--fg))]"
                >
                  {allPendingSelected ? "Deselect all" : "Select all"}
                </button>
              ) : null
            }
          >
            {sortedPending.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">No pending bookings</div>
                <div className="mt-1 text-sm text-[rgb(var(--muted))]">
                  New customer bookings will appear here.
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {sortedPending.map((b) => {
                  const busy = busyId === b.public_id;
                  const notes = formatNotes(b.notes);
                  const kind = getKind(b);
                  const bookee = getBookee(b);

                  return (
                    <BookingDispatchCard
                      key={b.public_id}
                      booking={b}
                      busy={busy}
                      kind={kind}
                      bookee={bookee}
                      notes={notes}
                      statusColor="amber"
                      selectable
                      selected={bulkSelected.has(b.public_id)}
                      onSelect={() => toggleBulkSelect(b.public_id)}
                      footer={
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => openCancelModal(b.public_id)}
                            disabled={busy || bulkBusy}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium transition hover:bg-white/[0.07] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <motion.button
                            type="button"
                            onClick={() => openAcceptModal(b.public_id)}
                            disabled={busy || bulkBusy}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Accept
                          </motion.button>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </Section>
        ) : null}

        {/* ── Accepted ── */}
        {!loading ? (
          <Section
            title="Accepted"
            subtitle="Ready to assign to a technician."
            count={sortedAccepted.length}
          >
            {sortedAccepted.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">No accepted bookings</div>
                <div className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Accepted bookings will appear here until assigned to a technician.
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {sortedAccepted.map((b) => {
                  const busy = busyId === b.public_id;
                  const notes = formatNotes(b.notes);
                  const kind = getKind(b);
                  const bookee = getBookee(b);

                  return (
                    <BookingDispatchCard
                      key={b.public_id}
                      booking={b}
                      busy={busy}
                      kind={kind}
                      bookee={bookee}
                      notes={notes}
                      statusColor="sky"
                      footer={
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => openCancelModal(b.public_id)}
                            disabled={busy}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium transition hover:bg-white/[0.07] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <motion.button
                            type="button"
                            onClick={() => openAssignModal(b)}
                            disabled={busy}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white shadow disabled:opacity-50"
                          >
                            <Wrench className="h-4 w-4" />
                            Assign Tech
                          </motion.button>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </Section>
        ) : null}
      </div>
    </>
  );
}
