"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  cancelBooking,
  getMyBookings,
  updateMyBooking,
  type BookingCard,
} from "../../../lib/api/bookings";

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

function formatNotes(notes: string | null) {
  const n = (notes ?? "").trim();
  return n.length ? n : null;
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

function BookingCardUI({
  b,
  onCancel,
  cancelling,
  onSaved,
}: {
  b: BookingCard;
  onCancel?: (publicId: string) => void;
  cancelling?: boolean;
  onSaved?: () => void;
}) {
  const canCancel = b.status === "pending" || b.status === "accepted" || b.status === "assigned";

  const canEdit = b.status === "pending" || b.status === "accepted";
  const canEditSchedule = b.status === "pending";
  const canEditNotes = b.status === "pending" || b.status === "accepted";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const [startsLocal, setStartsLocal] = useState(() => toDateTimeLocalValue(b.starts_at));
  const [endsLocal, setEndsLocal] = useState(() => toDateTimeLocalValue(b.ends_at));
  const [notesLocal, setNotesLocal] = useState(() => (b.notes ?? ""));

  // if parent refreshes, keep editor in sync when not editing
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

                {/* show pretty range as well */}
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

      {/* Notes */}
      {editing && canEditNotes ? (
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
            {b.status === "accepted"
              ? "Schedule is locked because your booking was accepted. You can still update notes."
              : "You can update schedule and notes while pending."}
          </div>
        </div>
      ) : formatNotes(b.notes) ? (
        <div
          className="mt-2 rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
        >
          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
            Notes:
          </div>
          <div className="mt-1 whitespace-pre-wrap break-words">{b.notes}</div>
        </div>
      ) : null}

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

          {canCancel && onCancel ? (
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

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [upcoming, setUpcoming] = useState<BookingCard[]>([]);
  const [history, setHistory] = useState<BookingCard[]>([]);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const hasAny = useMemo(() => upcoming.length > 0 || history.length > 0, [upcoming.length, history.length]);

  async function refresh() {
    const res = await getMyBookings();
    setUpcoming(res.upcoming || []);
    setHistory(res.history || []);
  }

  async function onCancelBooking(publicId: string) {
    const ok = confirm("Cancel this booking?");
    if (!ok) return;

    try {
      setCancellingId(publicId);
      setErr(null);

      await cancelBooking(publicId);
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to cancel booking";
      setErr(msg);
    } finally {
      setCancellingId(null);
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

        setUpcoming(res.upcoming || []);
        setHistory(res.history || []);
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to load bookings";
        setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Bookings</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Your upcoming appointments and booking history.
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

      {!loading && upcoming.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Upcoming</h3>
          <div className="grid gap-3">
            {upcoming.map((b) => (
              <BookingCardUI
                key={b.public_id}
                b={b}
                onCancel={onCancelBooking}
                cancelling={cancellingId === b.public_id}
                onSaved={refresh}
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
              <BookingCardUI key={b.public_id} b={b} onSaved={refresh} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}