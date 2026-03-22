"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, RefreshCw, Users, Wrench, X } from "lucide-react";
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

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-[rgb(var(--fg))]">{value}</div>
    </div>
  );
}

export default function TechBookingsPage() {
  const router = useRouter();

  const [technicians, setTechnicians] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  const activeTechnicians = useMemo(() => {
    return technicians.filter((tech) => (tech.bookings?.length ?? 0) > 0).length;
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
    setNotice(null);

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
      setNotice(null);
      setReassigningBookingId(reassignState.bookingPublicId);

      await reassignBooking(reassignState.bookingPublicId, workerUserId);

      setReassignState(INITIAL_REASSIGN_STATE);
      setNotice("Technician assignment updated.");
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
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading technician bookings…
      </div>
    );
  }

  if (pageErr) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{pageErr}</span>
          <button type="button" onClick={() => setPageErr(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.06]"
          onClick={() => void refresh()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <main className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[rgb(var(--fg))]">Tech Bookings</h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              View each technician’s assigned appointments and open any booking in its own detail page.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActionErr(null);
                setNotice(null);
                void refresh();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {actionErr ? (
          <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{actionErr}</span>
            <button type="button" onClick={() => setActionErr(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {notice ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {reassigningBookingId ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-[rgb(var(--muted))]">
            Updating technician assignment…
          </div>
        ) : null}

        <SectionCard
          title="Assignment Overview"
          subtitle="Current technician workload across active assigned bookings."
          icon={<ClipboardList className="h-5 w-5" />}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Technicians" value={technicians.length} />
            <StatBox label="Active Techs" value={activeTechnicians} />
            <StatBox label="Assigned Jobs" value={totalAssigned} />
            <StatBox label="Unassigned View" value="Per Tech" />
          </div>
        </SectionCard>

        <SectionCard
          title="Technician Assignments"
          subtitle="Expand a technician to review assigned bookings, customer info, and location details."
          icon={<Users className="h-5 w-5" />}
          actions={
            <span className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]">
              {totalAssigned} total assigned
            </span>
          }
        >
          {technicians.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">No technician bookings found</div>
              <div className="mt-1 text-sm text-[rgb(var(--muted))]">
                Assigned bookings will appear here once dispatch activity begins.
              </div>
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
                    onOpenDetail={(publicId) =>
                      router.push(`/account/techbookings/bookings/${publicId}`)
                    }
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