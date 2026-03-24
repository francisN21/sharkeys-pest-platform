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

function SectionDivider({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg text-xs"
        style={{ background: "rgba(var(--fg), 0.07)" }}
      >
        <i className={icon} style={{ color: "rgb(var(--muted))", fontSize: "11px" }} />
      </div>
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: "rgb(var(--muted))" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgb(var(--border))" }} />
    </div>
  );
}

function DashCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
    >
      {children}
    </div>
  );
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
        if (!res?.ok || !res.user) { router.replace("/login"); return; }
        setData(res);
        if (!isSuperUser(res)) { router.replace("/account"); return; }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgb(var(--border))", borderTopColor: "transparent" }} />
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>Loading dashboard…</div>
          </div>
        </main>
      </>
    );
  }

  if (!isSU) return null;

  return (
    <div className="min-h-screen" style={{ background: "rgb(var(--background))" }}>
      <Navbar />

      {/* Page header */}
      <div
        className="border-b"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--fg), 0.05)" }}
              >
                <i className="fa-solid fa-chart-line text-sm" style={{ color: "rgb(var(--muted))" }} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Owner Dashboard</h1>
                <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Sharkys Pest Control · Bay Area · Analytics &amp; CRM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "rgb(16,185,129)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ borderColor: "rgb(var(--border))", background: "transparent" }}
              >
                ← Back to Account
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            <div className="min-w-max">
              <OwnerRouteTabs pathname={pathname} loading={loading} />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard body */}
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-4 sm:px-6">

        {/* ── REVENUE & BOOKINGS ───────────────────────────── */}
        <SectionDivider label="Revenue & Bookings" icon="fa-solid fa-dollar-sign" />

        <DashCard><RevenueOverview /></DashCard>
        <DashCard><BookingsOverview /></DashCard>
        <DashCard><ServiceRevenueOverview /></DashCard>
        <DashCard><RevenueBySegmentOverview /></DashCard>

        {/* ── CUSTOMERS & LEADS ────────────────────────────── */}
        <SectionDivider label="Customers & Leads" icon="fa-solid fa-users" />

        <DashCard><CustomersOverview /></DashCard>
        <DashCard><RepeatCustomerOverview /></DashCard>
        <DashCard><LeadConversionAgeOverview /></DashCard>

        {/* ── TRAFFIC & ACQUISITION ────────────────────────── */}
        <SectionDivider label="Traffic & Acquisition" icon="fa-solid fa-chart-bar" />

        <DashCard><TrafficOverview days={30} /></DashCard>
        <DashCard><SurveyOverview /></DashCard>

        {/* ── TEAM & SERVICES ──────────────────────────────── */}
        <SectionDivider label="Team & Services" icon="fa-solid fa-user-gear" />

        <DashCard><TechnicianPerformanceOverview /></DashCard>
        <DashCard><ServicesOverview /></DashCard>
      </main>
    </div>
  );
}
