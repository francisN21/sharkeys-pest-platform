// frontend/src/app/account/bookings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  cancelBooking,
  getMyBookings,
  updateMyBooking,
  type BookingCard,
} from "../../../lib/api/bookings";

import BookingInfoCard from "../../../components/cards/BookingInfoCard";
import Messenger, { type MessengerMessage } from "../../../components/messenger/Messenger";
import { listBookingMessages, sendBookingMessage, editBookingMessage } from "../../../lib/api/messages";
import { me as apiMe } from "../../../lib/api/auth";

/** ---------------- Helpers (existing) ---------------- */

function formatBookingTimeRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;

  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

function StatusPill({ status }: { status: BookingCard["status"] }) {
  const label =
    status === "pending"
      ? "Pending"
      : status === "accepted"
      ? "Accepted"
      : status === "assigned"
      ? "Assigned"
      : status === "completed"
      ? "Completed"
      : "Cancelled";

  return (
    <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
      {label}
    </span>
  );
}

function normalizeText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

// Convert ISO string -> value for <input type="datetime-local" />
function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// Convert datetime-local value -> ISO string
function fromDateTimeLocalValue(v: string) {
  const d = new Date(v); // interpreted as local time
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** ---------------- Optional fields (existing) ---------------- */

type PersonLite = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
};

type BookingCardWithOps = BookingCard & {
  assigned_to?: PersonLite | null;
  completed_by?: PersonLite | null;

  assigned_to_name?: string | null;
  assigned_to_phone?: string | null;
  assigned_to_email?: string | null;

  completed_by_name?: string | null;
  completed_by_phone?: string | null;
  completed_by_email?: string | null;

  // new backend fields (optional) - safe, won’t break old code
  assigned_worker_first_name?: string | null;
  assigned_worker_last_name?: string | null;
  assigned_worker_phone?: string | null;
  assigned_worker_email?: string | null;

  completed_by_first_name?: string | null;
  completed_by_last_name?: string | null;

  completed_at?: string | null;
};

function fullName(first?: string | null, last?: string | null) {
  const f = normalizeText(first);
  const l = normalizeText(last);
  const s = `${f ?? ""} ${l ?? ""}`.trim();
  return s.length ? s : null;
}

function pickAssigned(b: BookingCardWithOps): PersonLite | null {
  const obj = b.assigned_to ?? null;

  const name =
    normalizeText(obj?.name ?? b.assigned_to_name) ??
    fullName(b.assigned_worker_first_name, b.assigned_worker_last_name);

  const phone = normalizeText(obj?.phone ?? b.assigned_to_phone ?? b.assigned_worker_phone);
  const email = normalizeText(obj?.email ?? b.assigned_to_email ?? b.assigned_worker_email);
  const role = normalizeText(obj?.role);

  if (!name && !phone && !email && !role) return null;
  return { name, phone, email, role };
}

function pickCompleted(b: BookingCardWithOps): PersonLite | null {
  const obj = b.completed_by ?? null;

  const name =
    normalizeText(obj?.name ?? b.completed_by_name) ??
    fullName(b.completed_by_first_name, b.completed_by_last_name);

  const phone = normalizeText(obj?.phone ?? b.completed_by_phone);
  const email = normalizeText(obj?.email ?? b.completed_by_email);
  const role = normalizeText(obj?.role);

  if (!name && !phone && !email && !role) return null;
  return { name, phone, email, role };
}

function PersonRow({
  title,
  person,
  showEvenIfEmpty,
  footer,
}: {
  title: string;
  person: PersonLite | null;
  showEvenIfEmpty?: boolean;
  footer?: React.ReactNode;
}) {
  if (!person && !showEvenIfEmpty && !footer) return null;

  const name = normalizeText(person?.name);
  const phone = normalizeText(person?.phone);
  const email = normalizeText(person?.email);
  const role = normalizeText(person?.role);

  const hasAny = !!(name || phone || email || role);

  return (
    <div
      className="rounded-xl border p-3 text-sm"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {title}
      </div>

      {hasAny ? (
        <div className="mt-1">
          <div className="font-semibold">{name ?? "—"}</div>
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            {role ? `${role} • ` : ""}
            {phone ?? "—"}
            {email ? ` • ${email}` : ""}
          </div>
        </div>
      ) : (
        <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
          —
        </div>
      )}

      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}

function NotesBlock({
  editing,
  canEditNotes,
  notesLocal,
  setNotesLocal,
  saving,
  notesPretty,
  status,
}: {
  editing: boolean;
  canEditNotes: boolean;
  notesLocal: string;
  setNotesLocal: (v: string) => void;
  saving: boolean;
  notesPretty: string;
  status: BookingCard["status"];
}) {
  return editing && canEditNotes ? (
    <div
      className="mt-2 rounded-xl border p-3 text-sm space-y-2"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        Notes:
      </div>
      <textarea
        value={notesLocal}
        onChange={(e) => setNotesLocal(e.target.value)}
        rows={3}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        placeholder="Add notes for the technician (gate code, pets, parking, etc.)"
        disabled={saving}
      />
      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
        {status === "accepted"
          ? "Schedule is locked because your booking was accepted. You can still update notes."
          : "You can update schedule and notes while pending."}
      </div>
    </div>
  ) : (
    <div
      className="mt-2 rounded-xl border p-3 text-sm"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        Notes:
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words">{notesPretty}</div>
    </div>
  );
}

function ConfirmCancelModal({
  open,
  bookingId,
  serviceTitle,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  bookingId: string | null;
  serviceTitle: string | null;
  busy: boolean;
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
      {/* overlay */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
        disabled={busy}
      />

      {/* modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border p-4 shadow-lg"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        role="dialog"
        aria-modal="true"
        aria-label="Cancel booking confirmation"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold">Cancel this booking?</div>
            <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              This will cancel your appointment request.
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

        <div
          className="mt-3 rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
        >
          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
            Booking
          </div>
          <div className="mt-1 font-semibold truncate">{serviceTitle ?? "—"}</div>
          <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
            Booking ID: <span className="font-mono">{bookingId ?? "—"}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={onClose}
            disabled={busy}
            title="Keep booking"
          >
            Keep
          </button>

          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            onClick={onConfirm}
            disabled={busy}
            title="Confirm cancel"
          >
            {busy ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ---------------- Me typing + safe number ---------------- */

type MeShape = { id: number; first_name?: string | null; last_name?: string | null };

function safeToNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

/** ---------------- Card UI (add Detail button) ---------------- */

function BookingCardUI({
  b,
  onCancel,
  cancelling,
  onSaved,
  onOpenDetail,
}: {
  b: BookingCard;
  onCancel?: (publicId: string) => void;
  cancelling?: boolean;
  onSaved?: () => void;
  onOpenDetail: (publicId: string) => void;
}) {
  const bb = b as BookingCardWithOps;

  const canCancel = b.status === "pending" || b.status === "accepted" || b.status === "assigned";

  const canEdit = b.status === "pending" || b.status === "accepted";
  const canEditSchedule = b.status === "pending";
  const canEditNotes = b.status === "pending" || b.status === "accepted";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const [startsLocal, setStartsLocal] = useState(() => toDateTimeLocalValue(b.starts_at));
  const [endsLocal, setEndsLocal] = useState(() => toDateTimeLocalValue(b.ends_at));
  const [notesLocal, setNotesLocal] = useState(() => b.notes ?? "");

  useEffect(() => {
    if (editing) return;
    setStartsLocal(toDateTimeLocalValue(b.starts_at));
    setEndsLocal(toDateTimeLocalValue(b.ends_at));
    setNotesLocal(b.notes ?? "");
  }, [b.starts_at, b.ends_at, b.notes, editing]);

  async function onSave() {
    setLocalErr(null);

    try {
      setSaving(true);

      const payload: { starts_at?: string; ends_at?: string; notes?: string | null } = {};

      if (canEditSchedule) {
        const sIso = fromDateTimeLocalValue(startsLocal);
        const eIso = fromDateTimeLocalValue(endsLocal);

        if (!sIso || !eIso) {
          setLocalErr("Please enter a valid start and end date/time.");
          return;
        }

        const st = new Date(sIso).getTime();
        const en = new Date(eIso).getTime();
        if (!Number.isFinite(st) || !Number.isFinite(en) || en <= st) {
          setLocalErr("End time must be after start time.");
          return;
        }

        payload.starts_at = sIso;
        payload.ends_at = eIso;
      }

      if (canEditNotes) {
        const trimmed = notesLocal.trim();
        payload.notes = trimmed.length ? trimmed : null;
      }

      await updateMyBooking(b.public_id, payload);

      setEditing(false);
      onSaved?.();
    } catch (e: unknown) {
      setLocalErr(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function onCancelEdit() {
    setLocalErr(null);
    setEditing(false);
    setStartsLocal(toDateTimeLocalValue(b.starts_at));
    setEndsLocal(toDateTimeLocalValue(b.ends_at));
    setNotesLocal(b.notes ?? "");
  }

  const assigned = pickAssigned(bb);
  const completed = pickCompleted(bb);

  const notesPretty = normalizeText(b.notes) ?? "—";
  const completedAtPretty = bb.completed_at ? new Date(bb.completed_at).toLocaleString() : null;

  return (
    <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{b.service_title}</div>

          <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
            {editing && canEditSchedule ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                      Start
                    </div>
                    <input
                      type="datetime-local"
                      value={startsLocal}
                      onChange={(e) => setStartsLocal(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                      End
                    </div>
                    <input
                      type="datetime-local"
                      value={endsLocal}
                      onChange={(e) => setEndsLocal(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  {formatBookingTimeRange(
                    fromDateTimeLocalValue(startsLocal) ?? b.starts_at,
                    fromDateTimeLocalValue(endsLocal) ?? b.ends_at
                  )}
                </div>
              </div>
            ) : (
              formatBookingTimeRange(b.starts_at, b.ends_at)
            )}
          </div>

          <div className="mt-1 text-sm truncate" style={{ color: "rgb(var(--muted))" }}>
            {b.address}
          </div>
        </div>

        <StatusPill status={b.status} />
      </div>

      <NotesBlock
        editing={editing}
        canEditNotes={canEditNotes}
        notesLocal={notesLocal}
        setNotesLocal={setNotesLocal}
        saving={saving}
        notesPretty={notesPretty}
        status={b.status}
      />

      {b.status !== "completed" ? <PersonRow title="Assigned To:" person={assigned} /> : null}

      <PersonRow
        title="Completed By:"
        person={completed}
        showEvenIfEmpty={!!completedAtPretty}
        footer={
          completedAtPretty ? (
            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Completed at: {completedAtPretty}
            </div>
          ) : null
        }
      />

      {localErr ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {localErr}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Booking ID: <span className="font-mono">{b.public_id}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Details always available */}
          <button
            type="button"
            className="rounded-lg border px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            onClick={() => onOpenDetail(b.public_id)}
            disabled={saving || !!cancelling}
            title="View booking details"
          >
            Details
          </button>

          {canEdit ? (
            editing ? (
              <>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  onClick={onSave}
                  disabled={saving}
                  title="Save changes"
                >
                  {saving ? "Saving…" : "Save"}
                </button>

                <button
                  type="button"
                  className="rounded-lg border px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                  onClick={onCancelEdit}
                  disabled={saving}
                  title="Cancel editing"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="rounded-lg border px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                onClick={() => setEditing(true)}
                disabled={saving}
                title={b.status === "accepted" ? "Edit notes" : "Edit schedule and notes"}
              >
                Edit
              </button>
            )
          ) : null}

          {!editing && canCancel && onCancel ? (
            <button
              type="button"
              className="rounded-lg border px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              onClick={() => onCancel(b.public_id)}
              disabled={!!cancelling || saving}
              title="Cancel booking"
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** ---------------- Page ---------------- */

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [pending, setPending] = useState<BookingCard[]>([]);
  const [upcoming, setUpcoming] = useState<BookingCard[]>([]);
  const [history, setHistory] = useState<BookingCard[]>([]);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // view state
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingCard | null>(null);

  // me (for messenger optimistic UI)
  const [me, setMe] = useState<MeShape | null>(null);

  // messages
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [msgSending, setMsgSending] = useState(false);

  // Modal state
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmCancelTitle, setConfirmCancelTitle] = useState<string | null>(null);

  const hasAny = useMemo(
    () => pending.length > 0 || upcoming.length > 0 || history.length > 0,
    [pending.length, upcoming.length, history.length]
  );

  function splitUpcoming(list: BookingCard[]) {
    const p = list.filter((b) => b.status === "pending");
    const u = list.filter((b) => b.status !== "pending");
    return { p, u };
  }

  async function refresh() {
    const res = await getMyBookings();
    const split = splitUpcoming(res.upcoming || []);
    setPending(split.p);
    setUpcoming(split.u);
    setHistory(res.history || []);
  }

  function findBooking(publicId: string): BookingCard | null {
    const all = [...pending, ...upcoming, ...history];
    return all.find((x) => x.public_id === publicId) ?? null;
  }

  function openCancelModal(publicId: string) {
    const found = findBooking(publicId);
    setConfirmCancelId(publicId);
    setConfirmCancelTitle(found?.service_title ?? null);
  }

  function closeCancelModal() {
    if (confirmCancelId && cancellingId === confirmCancelId) return;
    setConfirmCancelId(null);
    setConfirmCancelTitle(null);
  }

  async function confirmCancelBooking() {
    if (!confirmCancelId) return;

    try {
      setCancellingId(confirmCancelId);
      setErr(null);

      await cancelBooking(confirmCancelId);
      await refresh();

      // close modal after successful cancel
      setConfirmCancelId(null);
      setConfirmCancelTitle(null);

      // if user is looking at the same booking, return to list
      if (selectedBookingId === confirmCancelId) {
        backToList();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to cancel booking";
      setErr(msg);
    } finally {
      setCancellingId(null);
    }
  }

  async function loadMessages(publicId: string) {
    setMsgErr(null);
    setMsgLoading(true);
    try {
      const res = await listBookingMessages(publicId);

      const mapped: MessengerMessage[] = (res.messages ?? [])
        .map((m) => {
          const senderId = Number(m.sender_user_id);
          if (!Number.isFinite(senderId) || senderId <= 0) return null;

          return {
            id: Number(m.id),
            sender_user_id: senderId,
            sender_role: m.sender_role,
            body: m.body,
            created_at: m.created_at,
            updated_at: m.updated_at ?? null,
            delivered_at: m.delivered_at ?? null,
            first_name: m.first_name ?? null,
            last_name: m.last_name ?? null,
          } satisfies MessengerMessage;
        })
        .filter((x): x is MessengerMessage => x !== null);

      setMessages(mapped);
    } catch (e: unknown) {
      setMsgErr(e instanceof Error ? e.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }

  async function openDetail(publicId: string) {
    setErr(null);
    setMsgErr(null);

    setView("detail");
    setSelectedBookingId(publicId);

    const found = findBooking(publicId);
    setSelectedBooking(found);

    // load messages
    loadMessages(publicId);
  }

  function backToList() {
    setView("list");
    setSelectedBookingId(null);
    setSelectedBooking(null);

    setMessages([]);
    setMsgErr(null);
    setMsgLoading(false);
    setMsgSending(false);
  }

  async function onSendMessage(body: string) {
    const publicId = selectedBookingId;
    if (!publicId) return;

    const senderId = me?.id;
    if (!senderId) {
      setMsgErr("You must be signed in to send messages.");
      return;
    }

    const trimmed = body.trim();
    if (!trimmed) return;

    setMsgErr(null);
    setMsgSending(true);

    const tempId = -Math.floor(Math.random() * 1_000_000);

    const optimistic: MessengerMessage = {
      id: tempId,
      sender_user_id: senderId,
      sender_role: "customer",
      body: trimmed,
      created_at: new Date().toISOString(),
      updated_at: null,
      delivered_at: new Date().toISOString(),
      first_name: me.first_name ?? null,
      last_name: me.last_name ?? null,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await sendBookingMessage(publicId, trimmed);
      const saved = res.message;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                id: Number(saved.id),
                sender_user_id: Number(saved.sender_user_id),
                sender_role: saved.sender_role,
                body: saved.body,
                created_at: saved.created_at,
                updated_at: saved.updated_at ?? null,
                delivered_at: saved.delivered_at ?? null,
                first_name: saved.first_name ?? me.first_name ?? null,
                last_name: saved.last_name ?? me.last_name ?? null,
              }
            : m
        )
      );
    } catch (e: unknown) {
      setMsgErr(e instanceof Error ? e.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setMsgSending(false);
    }
  }

  async function onEditMessage(messageId: number, body: string) {
    const publicId = selectedBookingId;
    if (!publicId) return;

    const trimmed = body.trim();
    if (!trimmed) return;

    setMsgErr(null);

    // optimistic update
    const before = messages;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, body: trimmed, updated_at: new Date().toISOString() } : m))
    );

    try {
      const res = await editBookingMessage(publicId, messageId, trimmed);
      const saved = res.message;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                body: saved.body,
                updated_at: saved.updated_at ?? m.updated_at,
              }
            : m
        )
      );
    } catch (e: unknown) {
      setMsgErr(e instanceof Error ? e.message : "Failed to edit message");
      setMessages(before); // rollback
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await getMyBookings();
        if (!alive) return;

        const split = splitUpcoming(res.upcoming || []);
        setPending(split.p);
        setUpcoming(split.u);
        setHistory(res.history || []);

        // me for messenger
        const meRes = await apiMe();
        if (!alive) return;

        const user = meRes.user ?? null;
        const idNum = safeToNumber((user as unknown as { id?: unknown } | null)?.id);

        if (user && idNum) {
          setMe({
            id: idNum,
            first_name: (user as unknown as { first_name?: string | null }).first_name ?? null,
            last_name: (user as unknown as { last_name?: string | null }).last_name ?? null,
          });
        } else {
          setMe(null);
        }
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load bookings");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const cancelBusy = !!confirmCancelId && cancellingId === confirmCancelId;

  /** ---------------- Detail View ---------------- */
  if (view === "detail") {
    const b = selectedBooking;

    return (
      <main className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <button
                type="button"
                onClick={backToList}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              >
                ← Back to Bookings
              </button>

              <h2 className="text-xl font-bold">{b ? `Booking ${b.public_id}` : "Booking"}</h2>
              <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                Booking details and message thread.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedBookingId) return;
                  await refresh();
                  const found = findBooking(selectedBookingId);
                  setSelectedBooking(found);
                  await loadMessages(selectedBookingId);
                }}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                disabled={!selectedBookingId || msgLoading || msgSending}
                title="Refresh booking + messages"
              >
                Refresh
              </button>
            </div>
          </div>

          {err ? (
            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
              {err}
            </div>
          ) : null}

          {!b ? (
            <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
              This booking could not be found. It may have been removed or changed.
            </div>
          ) : (
            <BookingInfoCard booking={b} />
          )}
        </section>

        <section className="space-y-3">
          {msgErr ? (
            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
              {msgErr}
            </div>
          ) : null}

          <Messenger
            meUserId={me?.id ?? null}
            meFirstName={me?.first_name ?? null}
            meLastName={me?.last_name ?? null}
            messages={messages}
            onSend={onSendMessage}
            onEdit={onEditMessage}
            sending={msgSending || msgLoading}
          />
        </section>
      </main>
    );
  }

  /** ---------------- List View ---------------- */

  return (
    <div className="space-y-5">
      <ConfirmCancelModal
        open={!!confirmCancelId}
        bookingId={confirmCancelId}
        serviceTitle={confirmCancelTitle}
        busy={cancelBusy}
        onConfirm={confirmCancelBooking}
        onClose={closeCancelModal}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Bookings</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Your pending requests, upcoming appointments, and booking history.
          </p>
        </div>

        <Link
          href="/book"
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          Book a Service
        </Link>
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading…
        </div>
      ) : null}

      {!loading && !hasAny ? (
        <div className="rounded-2xl border p-6 text-sm space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="font-semibold">No bookings yet</div>
          <div style={{ color: "rgb(var(--muted))" }}>Book your first service and it’ll show up here.</div>

          <Link
            href="/book"
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            Book a Service
          </Link>
        </div>
      ) : null}

      {!loading && pending.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Pending</h3>
          <div className="grid gap-3">
            {pending.map((b) => (
              <BookingCardUI
                key={b.public_id}
                b={b}
                onCancel={openCancelModal}
                cancelling={cancellingId === b.public_id}
                onSaved={refresh}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && upcoming.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Upcoming</h3>
          <div className="grid gap-3">
            {upcoming.map((b) => (
              <BookingCardUI
                key={b.public_id}
                b={b}
                onCancel={openCancelModal}
                cancelling={cancellingId === b.public_id}
                onSaved={refresh}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && history.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">History</h3>
          <div className="grid gap-3">
            {history.map((b) => (
              <BookingCardUI key={b.public_id} b={b} onSaved={refresh} onOpenDetail={openDetail} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}