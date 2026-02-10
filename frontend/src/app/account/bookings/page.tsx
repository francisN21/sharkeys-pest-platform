"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cancelBooking, getMyBookings, type BookingCard } from "../../../lib/api/bookings";

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

function BookingCardUI({
  b,
  onCancel,
  cancelling,
}: {
  b: BookingCard;
  onCancel?: (publicId: string) => void;
  cancelling?: boolean;
}) {
  const canCancel = b.status === "pending" || b.status === "accepted" || b.status === "assigned";

  return (
    <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{b.service_title}</div>
          <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
            {formatBookingTimeRange(b.starts_at, b.ends_at)}
          </div>
          <div className="mt-1 text-sm truncate" style={{ color: "rgb(var(--muted))" }}>
            {b.address}
          </div>
        </div>

        <StatusPill status={b.status} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Booking ID: <span className="font-mono">{b.public_id}</span>
        </div>

        {canCancel && onCancel ? (
          <button
            type="button"
            className="rounded-lg border px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={() => onCancel(b.public_id)}
            disabled={!!cancelling}
            title="Cancel booking"
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        ) : null}
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
              />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && history.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">History</h3>
          <div className="grid gap-3">{history.map((b) => <BookingCardUI key={b.public_id} b={b} />)}</div>
        </section>
      ) : null}
    </div>
  );
}