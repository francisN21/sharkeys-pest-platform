"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  adminAcceptBooking,
  adminCancelBooking,
  getAdminBookings,
  type AdminBookingRow,
  adminListTechnicians,
  adminAssignBooking,
  type TechnicianRow,
} from "../../../../lib/api/adminBookings";

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

function KindPill({ kind }: { kind: PersonKind }) {
  const isLead = kind === "lead";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
      style={{
        borderColor: "rgb(var(--border))",
        background: isLead ? "rgba(245, 158, 11, 0.18)" : "rgba(var(--bg), 0.20)",
      }}
      title={isLead ? "Unregistered lead" : "Registered customer"}
    >
      {isLead ? "Lead" : "Registered"}
    </span>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize sm:text-xs"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
    >
      {label}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs sm:text-sm" style={{ color: "rgb(var(--muted))" }}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {children}
    </section>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
        {label}
      </div>
      <div className={`mt-1 break-words text-sm ${mono ? "font-mono text-[13px]" : ""}`}>{value}</div>
    </div>
  );
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

function BookingDispatchCard({
  booking,
  busy,
  kind,
  bookee,
  notes,
  rightPills,
  footer,
}: {
  booking: AdminBookingRow;
  busy: boolean;
  kind: PersonKind;
  bookee: ReturnType<typeof getBookee>;
  notes: string | null;
  rightPills: ReactNode;
  footer: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl border p-3 text-left sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="min-w-0 break-words text-sm font-semibold sm:text-base">{booking.service_title}</div>

            <div className="mt-2 break-words text-sm" style={{ color: "rgb(var(--muted))" }}>
              {formatRange(booking.starts_at, booking.ends_at)}
            </div>

            <div className="mt-2 break-words text-sm" style={{ color: "rgb(var(--muted))" }}>
              {bookee.displayName}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <KindPill kind={kind} />
            {rightPills}
          </div>
        </div>

        {expanded ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailRow label="Account type" value={formatAccountTypeLabel(bookee.accountType)} />
              <DetailRow label="Phone" value={bookee.phone || "—"} />
              <DetailRow label="Email" value={bookee.email || "—"} />
              <div className="sm:col-span-2">
                <DetailRow label="Location" value={booking.address || bookee.customerAddress || "—"} />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <DetailRow label="Booking ID" value={booking.public_id} mono />
              <DetailRow label="Created" value={formatCreated(booking.created_at)} />
            </div>

            {notes ? (
              <div
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.22)" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                  Customer Notes
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words">{notes}</div>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full rounded-xl border px-3 py-2 text-sm font-semibold transition hover:opacity-90 sm:w-auto"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.18)" }}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show more"}
          </button>

          <div className={`${busy ? "opacity-90" : ""}`}>{footer}</div>
        </div>
      </div>
    </div>
  );
}

function ConfirmAdminActionModal({
  open,
  title,
  message,
  details,
  busy,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  details?: ReactNode;
  busy: boolean;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
        disabled={busy}
      />

      <div
        className="relative w-full max-w-md rounded-2xl border p-4 shadow-lg"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold">{title}</div>
            <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              {message}
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg border px-2 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={onClose}
            disabled={busy}
            title="Close"
          >
            ✕
          </button>
        </div>

        {details ? (
          <div
            className="mt-3 rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          >
            {details}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={onClose}
            disabled={busy}
            title="Cancel"
          >
            {cancelLabel ?? "Cancel"}
          </button>

          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            onClick={onConfirm}
            disabled={busy}
            title={confirmLabel}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDispatchPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [pendingRows, setPendingRows] = useState<AdminBookingRow[]>([]);
  const [acceptedRows, setAcceptedRows] = useState<AdminBookingRow[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"created" | "scheduled">("created");

  const [techs, setTechs] = useState<TechnicianRow[]>([]);
  const [selectedTech, setSelectedTech] = useState<Record<string, number | "">>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"accept" | "cancel">("accept");
  const [modalBookingId, setModalBookingId] = useState<string | null>(null);
  const [modalBookingTitle, setModalBookingTitle] = useState<string | null>(null);

  async function refresh() {
    const [p, a] = await Promise.all([getAdminBookings("pending"), getAdminBookings("accepted")]);
    setPendingRows(p.bookings || []);
    setAcceptedRows(a.bookings || []);
  }

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
  }, []);

  const sortedPending = useMemo(() => {
    const copy = [...pendingRows];
    copy.sort((a, b) => {
      const aKey = sortBy === "created" ? a.created_at : a.starts_at;
      const bKey = sortBy === "created" ? b.created_at : b.starts_at;
      const at = new Date(aKey).getTime();
      const bt = new Date(bKey).getTime();
      return bt - at;
    });
    return copy;
  }, [pendingRows, sortBy]);

  const sortedAccepted = useMemo(() => {
    const copy = [...acceptedRows];
    copy.sort((a, b) => {
      const aKey = sortBy === "created" ? a.created_at : a.starts_at;
      const bKey = sortBy === "created" ? b.created_at : b.starts_at;
      const at = new Date(aKey).getTime();
      const bt = new Date(bKey).getTime();
      return bt - at;
    });
    return copy;
  }, [acceptedRows, sortBy]);

  function findBookingTitle(publicId: string) {
    const all = [...pendingRows, ...acceptedRows];
    const found = all.find((x) => x.public_id === publicId);
    return found?.service_title ?? null;
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

    try {
      setBusyId(modalBookingId);
      setErr(null);

      if (modalKind === "accept") {
        await adminAcceptBooking(modalBookingId);
      } else {
        await adminCancelBooking(modalBookingId);
      }

      await refresh();
      closeModal();
    } catch (e: unknown) {
      setErr(
        e instanceof Error
          ? e.message
          : modalKind === "accept"
            ? "Failed to accept booking"
            : "Failed to cancel booking"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onAssign(publicId: string) {
    const workerUserIdStr = selectedTech[publicId] ?? "";
    if (!workerUserIdStr) {
      setErr("Select a technician first.");
      return;
    }

    const workerUserId = Number(workerUserIdStr);
    if (!Number.isFinite(workerUserId) || workerUserId <= 0) {
      setErr("Invalid technician selected.");
      return;
    }

    try {
      setBusyId(publicId);
      setErr(null);

      await adminAssignBooking(publicId, workerUserId);
      await refresh();

      setSelectedTech((prev) => ({ ...prev, [publicId]: "" }));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to assign technician");
    } finally {
      setBusyId(null);
    }
  }

  const modalBusy = !!modalBookingId && busyId === modalBookingId;

  const modalTitle = modalKind === "accept" ? "Accept this booking?" : "Cancel this booking?";
  const modalMessage =
    modalKind === "accept"
      ? "This will move the booking to Accepted so it can be assigned to a technician."
      : "This will mark it as cancelled (recommended) instead of hard deleting.";

  const modalConfirmLabel = modalKind === "accept" ? "Accept" : "Cancel";

  return (
    <div className="space-y-4 sm:space-y-6">
      <ConfirmAdminActionModal
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        busy={modalBusy}
        confirmLabel={modalConfirmLabel}
        cancelLabel="Close"
        onConfirm={confirmModalAction}
        onClose={closeModal}
        details={
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
              Booking
            </div>
            <div className="truncate font-semibold">{modalBookingTitle ?? "—"}</div>
            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Booking ID: <span className="font-mono">{modalBookingId ?? "—"}</span>
            </div>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Dispatch</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Pending customer bookings. Accept or cancel. Accepted bookings can be assigned to a technician.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Sort by
            </label>

            <select
              value={sortBy}
              onChange={(e) => {
                const v = e.target.value;
                setSortBy(v === "scheduled" ? "scheduled" : "created");
              }}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              <option value="created">Created</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={loading || !!busyId}
          >
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
        >
          {err}
        </div>
      ) : null}

      {loading ? (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
        >
          Loading…
        </div>
      ) : null}

      {!loading ? (
        <SectionCard
          title="Pending"
          subtitle="New bookings waiting for review before dispatch."
          actions={
            <StatusPill label={`${sortedPending.length} ${sortedPending.length === 1 ? "booking" : "bookings"}`} />
          }
        >
          {sortedPending.length === 0 ? (
            <div
              className="rounded-2xl border p-4 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
            >
              <div className="font-semibold">No pending bookings</div>
              <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
                When customers book services, they’ll appear here.
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
                    rightPills={<StatusPill label="Pending" />}
                    footer={
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => openCancelModal(b.public_id)}
                          disabled={busy}
                          className="w-full rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60 sm:w-auto"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                          title="Cancel booking"
                        >
                          {busy ? "Working…" : "Delete"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openAcceptModal(b.public_id)}
                          disabled={busy}
                          className="w-full rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60 sm:w-auto"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                          title="Accept booking"
                        >
                          {busy ? "Working…" : "Accept"}
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}

      {!loading ? (
        <SectionCard
          title="Accepted"
          subtitle="Bookings ready to assign to a technician."
          actions={
            <StatusPill label={`${sortedAccepted.length} ${sortedAccepted.length === 1 ? "booking" : "bookings"}`} />
          }
        >
          {sortedAccepted.length === 0 ? (
            <div
              className="rounded-2xl border p-4 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
            >
              <div className="font-semibold">No accepted bookings</div>
              <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
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
                    rightPills={<StatusPill label="Accepted" />}
                    footer={
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <select
                          className="w-full rounded-xl border px-3 py-2 text-sm sm:max-w-xs"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                          value={selectedTech[b.public_id] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSelectedTech((prev) => ({ ...prev, [b.public_id]: v ? Number(v) : "" }));
                          }}
                          disabled={busy}
                        >
                          <option value="">Select technician…</option>
                          {techs.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.last_name}, {t.first_name}
                              {t.phone ? ` • ${t.phone}` : ""}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => onAssign(b.public_id)}
                          disabled={busy}
                          className="w-full rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60 sm:w-auto"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                          title="Assign selected technician"
                        >
                          {busy ? "Working…" : "Assign"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openCancelModal(b.public_id)}
                          disabled={busy}
                          className="w-full rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60 sm:w-auto"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                          title="Cancel booking"
                        >
                          {busy ? "Working…" : "Cancel"}
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}