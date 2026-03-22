"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { me, type MeResponse } from "../../lib/api/auth";
import Navbar from "../../components/Navbar";
import TrafficOverview from "../../components/su-dashboard/TrafficOverview";
import BookingsOverview from "../../components/su-dashboard/BookingsOverview";
import CustomersOverview from "../../components/su-dashboard/CustomersOverview";
import SurveyOverview from "../../components/su-dashboard/SurveyOverview";
import ServicesOverview from "../../components/su-dashboard/ServicesOverview";
import RevenueOverview from "../../components/su-dashboard/RevenueOverview";
import ServiceRevenueOverview from "../../components/su-dashboard/ServiceRevenueOverview";
import TechnicianPerformanceOverview from "../../components/su-dashboard/TechnicianPerformanceOverview";
import RepeatCustomerOverview from "../../components/su-dashboard/RepeatCustomerOverview";
import RevenueBySegmentOverview from "../../components/su-dashboard/RevenueBySegmentOverview";
import LeadConversionAgeOverview from "../../components/su-dashboard/LeadConversionAgeOverview";
import OwnerRouteTabs from "./_components/owner-route-tabs";

type MeUserWithRoles = NonNullable<MeResponse["user"]> & {
  roles?: string[] | null;
  user_role?: string | null;
};

type MeResponseWithRoles = MeResponse & {
  user?: MeUserWithRoles;
  roles?: string[] | null;
};

function isSuperUser(res: MeResponse | null) {
  if (!res) return false;
  const withRoles = res as MeResponseWithRoles;

  const roles = (withRoles.user?.roles ?? withRoles.roles ?? [])
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    .map((r) => r.trim().toLowerCase());

  return roles.includes("superuser");
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const isSU = useMemo(() => isSuperUser(data), [data]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await me();
        if (!alive) return;

        if (!res?.ok || !res.user) {
          router.replace("/login");
          return;
        }

        setData(res);

        if (!isSuperUser(res)) {
          router.replace("/account");
          return;
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          Loading owner dashboard…
        </div>
      </main>
    );
  }

  if (!isSU) return null;

  return (
    <main className="min-h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />

      <div className="mx-auto max-w-6xl px-3 py-6 space-y-4 sm:px-4 sm:py-8 md:py-10 md:space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
            <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              Site access, customer sources, and booking performance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/account")}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--card))",
            }}
          >
            Back to Account
          </button>
        </div>

        <div
          className="w-full border-b pb-3 sm:pb-4"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <div className="min-w-max">
              <OwnerRouteTabs pathname={pathname} loading={loading} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <RevenueOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <BookingsOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <TrafficOverview days={30} />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <CustomersOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <SurveyOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <ServicesOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <ServiceRevenueOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <TechnicianPerformanceOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <RepeatCustomerOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <RevenueBySegmentOverview />
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <LeadConversionAgeOverview />
        </div>
      </div>
    </main>
  );
}