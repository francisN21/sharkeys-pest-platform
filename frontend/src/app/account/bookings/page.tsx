"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  cancelBooking,
  getMyBookings,
  type BookingCard,
} from "../../../lib/api/bookings";

import { me as apiMe } from "../../../lib/api/auth";

import type { MeShape } from "./types";
import { safeToNumber, splitUpcoming } from "./helpers";
import BookingCardUI from "./components/BookingCardUI";
import ConfirmCancelModal from "./components/ConfirmCancelModal";
import SectionCard from "./components/SectionCard";

type MeApiUser = {
  id?: unknown;
  first_name?: string | null;
  last_name?: string | null;
  user_role?: string | null;
  roles?: string[] | null;
};

type MeApiResponse = {
  user?: MeApiUser | null;
};

export default function BookingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pending, setPending] = useState<BookingCard[]>([]);
  const [upcoming, setUpcoming] = useState<BookingCard[]>([]);
  const [history, setHistory] = useState<BookingCard[]>([]);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmCancelTitle, setConfirmCancelTitle] = useState<string | null>(null);

  const [, setMe] = useState<MeShape | null>(null);

  const hasAny = useMemo(
    () => pending.length > 0 || upcoming.length > 0 || history.length > 0,
    [pending.length, upcoming.length, history.length]
  );

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

      setConfirmCancelId(null);
      setConfirmCancelTitle(null);
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

        const meRes = (await apiMe()) as MeApiResponse;
        if (!alive) return;

        const user = meRes.user ?? null;
        const idNum = safeToNumber(user?.id);
        const role = String(user?.user_role ?? (Array.isArray(user?.roles) ? user?.roles[0] : "")).trim().toLowerCase();

        if (user && idNum) {
          setMe({
            id: idNum,
            first_name: user.first_name ?? null,
            last_name: user.last_name ?? null,
            role: role || null,
          });
        } else {
          setMe(null);
        }

        const isCustomerOnly = role === "customer";

        if (!isCustomerOnly) {
          setForbidden(true);
          setAuthResolved(true);
          setLoading(false);
          router.replace("/account");
          return;
        }

        setForbidden(false);
        setAuthResolved(true);

        const res = await getMyBookings();
        if (!alive) return;

        const split = splitUpcoming(res.upcoming || []);
        setPending(split.p);
        setUpcoming(split.u);
        setHistory(res.history || []);
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
  }, [router]);

  const cancelBusy = !!confirmCancelId && cancellingId === confirmCancelId;

  if (!authResolved || (loading && forbidden)) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
        >
          Loading…
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <SectionCard
          title="Customers only"
          subtitle="This bookings page is only available for customer accounts. Staff and admin accounts are redirected to the main account area."
          actions={
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              Go to Account
            </Link>
          }
        >
          <div />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ConfirmCancelModal
        open={!!confirmCancelId}
        bookingId={confirmCancelId}
        serviceTitle={confirmCancelTitle}
        busy={cancelBusy}
        onConfirm={confirmCancelBooking}
        onClose={closeCancelModal}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

      {!loading && !hasAny ? (
        <SectionCard
          title="No bookings yet"
          subtitle="Book your first service and it’ll show up here."
          actions={
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              Book a Service
            </Link>
          }
        >
          <div />
        </SectionCard>
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
                onOpenDetail={(publicId) => router.push(`/account/bookings/${publicId}`)}
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
                onOpenDetail={(publicId) => router.push(`/account/bookings/${publicId}`)}
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
              <BookingCardUI
                key={b.public_id}
                b={b}
                onSaved={refresh}
                onOpenDetail={(publicId) => router.push(`/account/bookings/${publicId}`)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}