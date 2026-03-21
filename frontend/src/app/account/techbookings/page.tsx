"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminTechBookings,
  reassignBooking,
  type TechRow,
} from "../../../lib/api/adminTechBookings";

import { me as apiMe } from "../../../lib/api/auth";
import type { MeApiResponse } from "./types";
import { getErrorMessage, userToMe } from "./helpers";
import SectionCard from "./components/SectionCard";
import TechWorkerSection from "./components/TechWorkerSection";
import ReassignTechModal from "./components/ReassignTechModal";

type ReassignState = {
  open: boolean;
  bookingPublicId: string | null;
  currentWorkerId: number | null;
  customerName: string | null;
  serviceName: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

const INITIAL_REASSIGN_STATE: ReassignState = {
  open: false,
  bookingPublicId: null,
  currentWorkerId: null,
  customerName: null,
  serviceName: null,
  startsAt: null,
  endsAt: null,
};

export default function TechBookingsPage() {
  const router = useRouter();

  const [technicians, setTechnicians] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [reassigningBookingId, setReassigningBookingId] = useState<string | null>(null);
  const [reassignState, setReassignState] = useState<ReassignState>(INITIAL_REASSIGN_STATE);

  const [expandedTechs, setExpandedTechs] = useState<Record<number, boolean>>({});
  const [, setMe] = useState<{ id: number; first_name?: string | null; last_name?: string | null } | null>(null);

  async function refresh() {
    setPageErr(null);
    setLoading(true);
    try {
      const data = await getAdminTechBookings();
      const nextTechs = data.technicians ?? [];
      setTechnicians(nextTechs);

      setExpandedTechs((prev) => {
        const next: Record<number, boolean> = {};
        for (const tech of nextTechs) {
          const count = tech.bookings?.length ?? 0;
          next[Number(tech.user_id)] = prev[Number(tech.user_id)] ?? (count > 0 && count <= 2);
        }
        return next;
      });
    } catch (error: unknown) {
      setPageErr(getErrorMessage(error, "Failed to load technician bookings"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await refresh();

        const res = (await apiMe()) as MeApiResponse;
        if (!alive) return;
        setMe(userToMe(res.user ?? null));
      } catch {
        if (!alive) return;
        setMe(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const totalAssigned = useMemo(() => {
    return technicians.reduce((sum, tech) => sum + (tech.bookings?.length ?? 0), 0);
  }, [technicians]);

  const technicianOptions = useMemo(() => {
    return technicians.map((tech) => ({
      user_id: Number(tech.user_id),
      public_id: tech.public_id ?? null,
      first_name: tech.first_name ?? null,
      last_name: tech.last_name ?? null,
      email: tech.email ?? null,
      phone: tech.phone ?? null,
    }));
  }, [technicians]);

  function openReassignModal(bookingPublicId: string) {
    setActionErr(null);

    const booking = technicians
      .flatMap((tech) => tech.bookings ?? [])
      .find((b) => b.public_id === bookingPublicId);

    const currentWorkerId =
      booking && "worker_user_id" in booking && booking.worker_user_id != null
        ? Number(booking.worker_user_id)
        : null;

    const customerName =
      booking && "customer_name" in booking && booking.customer_name
        ? String(booking.customer_name)
        : null;

    const serviceName =
      booking && "service_title" in booking && booking.service_title
        ? String(booking.service_title)
        : null;

    const startsAt =
      booking && "starts_at" in booking && booking.starts_at
        ? String(booking.starts_at)
        : null;

    const endsAt =
      booking && "ends_at" in booking && booking.ends_at
        ? String(booking.ends_at)
        : null;

    setReassignState({
      open: true,
      bookingPublicId,
      currentWorkerId,
      customerName,
      serviceName,
      startsAt,
      endsAt,
    });
  }

  function closeReassignModal() {
    if (reassigningBookingId) return;
    setReassignState(INITIAL_REASSIGN_STATE);
  }

  async function handleConfirmReassign(workerUserId: number) {
    if (!reassignState.bookingPublicId) return;

    try {
      setActionErr(null);
      setReassigningBookingId(reassignState.bookingPublicId);

      await reassignBooking(reassignState.bookingPublicId, workerUserId);

      setReassignState(INITIAL_REASSIGN_STATE);
      await refresh();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to re-assign booking");
      setActionErr(message);
      throw new Error(message);
    } finally {
      setReassigningBookingId(null);
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl border p-4 text-sm"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgba(var(--bg), 0.12)",
          color: "rgb(var(--muted))",
        }}
      >
        Loading…
      </div>
    );
  }

  if (pageErr) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
        >
          {pageErr}
        </div>

        <button
          type="button"
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          onClick={refresh}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <main className="space-y-4 sm:space-y-6">
        <SectionCard
          title="Tech Bookings"
          subtitle="View each technician’s assigned appointments and open any booking in its own detail page."
          actions={
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(var(--bg), 0.18)",
                  color: "rgb(var(--muted))",
                }}
              >
                {totalAssigned} total assigned
              </span>

              <button
                type="button"
                onClick={() => refresh()}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              >
                Refresh
              </button>
            </div>
          }
        >
          {actionErr ? (
            <div
              className="mb-3 rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
            >
              {actionErr}
            </div>
          ) : null}

          {reassigningBookingId ? (
            <div
              className="mb-3 rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
            >
              Updating technician assignment…
            </div>
          ) : null}

          {technicians.length === 0 ? (
            <div
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
            >
              <span style={{ color: "rgb(var(--muted))" }}>No technician bookings found.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {technicians.map((tech) => {
                const techId = Number(tech.user_id);

                return (
                  <TechWorkerSection
                    key={tech.user_id}
                    technician={tech}
                    expanded={!!expandedTechs[techId]}
                    onToggle={() =>
                      setExpandedTechs((prev) => ({
                        ...prev,
                        [techId]: !prev[techId],
                      }))
                    }
                    onOpenDetail={(publicId) => router.push(`/account/techbookings/bookings/${publicId}`)}
                    onReassign={openReassignModal}
                  />
                );
              })}
            </div>
          )}
        </SectionCard>
      </main>

      <ReassignTechModal
        open={reassignState.open}
        onClose={closeReassignModal}
        onSubmit={handleConfirmReassign}
        bookingPublicId={reassignState.bookingPublicId}
        technicians={technicianOptions}
        currentWorkerId={reassignState.currentWorkerId}
        customerName={reassignState.customerName}
        serviceName={reassignState.serviceName}
        startsAt={reassignState.startsAt}
        endsAt={reassignState.endsAt}
        submitting={!!reassigningBookingId}
      />
    </>
  );
}