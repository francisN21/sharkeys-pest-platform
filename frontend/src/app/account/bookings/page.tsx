"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyBookings, type BookingCard } from "../../../lib/api/bookings";

function formatBookingTimeRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;

  const date = s.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    <span
      className="rounded-full border px-2 py-1 text-xs"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
    >
      {label}
    </span>
  );
}

function BookingCardUI({ b }: { b: BookingCard }) {
  return (
    <div
      className="rounded-2xl border p-4 space-y-2"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
    >
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

      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
        Booking ID: <span className="font-mono">{b.public_id}</span>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [upcoming, setUpcoming] = useState<BookingCard[]>([]);
  const [history, setHistory] = useState<BookingCard[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
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

  const hasAny = upcoming.length > 0 || history.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Bookings</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            View your upcoming services and booking history.
          </p>
        </div>

        <Link
          href="/book"
          className="rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90"
          style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
        >
          Book a service
        </Link>
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)", color: "rgb(var(--muted))" }}
        >
          Loading…
        </div>
      ) : null}

      {!loading && !hasAny ? (
        <div
          className="rounded-2xl border p-6 space-y-3"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
        >
          <div className="text-base font-semibold">No bookings yet</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            When you book a service, it will show up here along with your completed job history.
          </div>

          <div className="pt-2">
            <Link
              href="/book"
              className="inline-flex rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90"
              style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
            >
              Book your first service
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && upcoming.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Upcoming</h3>
          <div className="grid gap-3">
            {upcoming.map((b) => (
              <BookingCardUI key={b.public_id} b={b} />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && history.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">History</h3>
          <div className="grid gap-3">
            {history.map((b) => (
              <BookingCardUI key={b.public_id} b={b} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}