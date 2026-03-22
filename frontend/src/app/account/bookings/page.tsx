"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ClipboardList, Clock, RefreshCw, X } from "lucide-react";

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
        const role = String(
          user?.user_role ?? (Array.isArray(user?.roles) ? user?.roles[0] : "")
        )
          .trim()
          .toLowerCase();

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
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading…
      </div>
    );
  }

  if (forbidden) {
    return (
      <SectionCard
        icon={<ClipboardList className="h-5 w-5" />}
        title="Customers only"
        subtitle="This bookings page is only available for customer accounts. Staff and admin accounts are redirected to the main account area."
        actions={
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
          >
            Go to Account
          </Link>
        }
      >
        <div />
      </SectionCard>
    );
  }

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

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[rgb(var(--fg))]">My Bookings</h2>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Your pending requests, upcoming appointments, and booking history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-60"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.06]"
          >
            Book a Service
          </Link>
        </div>
      </div>

      {err ? (
        <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{err}</span>
          <button type="button" onClick={() => setErr(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading bookings…
        </div>
      ) : null}

      {!loading && !hasAny ? (
        <SectionCard
          icon={<Calendar className="h-5 w-5" />}
          title="No bookings yet"
          subtitle="Book your first service and it'll show up here."
          actions={
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.06]"
            >
              Book a Service
            </Link>
          }
        >
          <div />
        </SectionCard>
      ) : null}

      {!loading && pending.length > 0 ? (
        <SectionCard
          icon={<Clock className="h-5 w-5" />}
          title="Pending"
          subtitle={`${pending.length} ${pending.length === 1 ? "request" : "requests"} awaiting acceptance`}
        >
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
        </SectionCard>
      ) : null}

      {!loading && upcoming.length > 0 ? (
        <SectionCard
          icon={<Calendar className="h-5 w-5" />}
          title="Upcoming"
          subtitle={`${upcoming.length} scheduled ${upcoming.length === 1 ? "appointment" : "appointments"}`}
        >
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
        </SectionCard>
      ) : null}

      {!loading && history.length > 0 ? (
        <SectionCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="History"
          subtitle={`${history.length} completed ${history.length === 1 ? "booking" : "bookings"}`}
        >
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
        </SectionCard>
      ) : null}
    </div>
  );
}
