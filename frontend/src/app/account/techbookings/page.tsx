"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminTechBookings,
  type TechRow,
} from "../../../lib/api/adminTechBookings";

import { me as apiMe } from "../../../lib/api/auth";
import type { MeApiResponse } from "./types";
import { getErrorMessage, userToMe } from "./helpers";
import SectionCard from "./components/SectionCard";
import TechWorkerSection from "./components/TechWorkerSection";

export default function TechBookingsPage() {
  const router = useRouter();

  const [technicians, setTechnicians] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div
        className="rounded-2xl border p-4 text-sm"
        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)", color: "rgb(var(--muted))" }}
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
                />
              );
            })}
          </div>
        )}
      </SectionCard>
    </main>
  );
}