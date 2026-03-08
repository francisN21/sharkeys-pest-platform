"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import AccountPage from "./profile/page";
import BookingsPage from "./bookings/page";
import TechnicianPage from "../account/technician/page";
import AdminJobsPage from "../account/admin/jobs/page";
import AdminJobHistoryPage from "./admin/jobhistory/page";
import AdminCustomersPage from "../account/admin/customers/page";
import AdminLeadsPage from "../account/admin/leads/page";
import { me, type MeResponse } from "../../lib/api/auth";
import TechBookingsPage from "./techbookings/page";

import { SlideTabs, type SlideTabItem } from "../../components/ui/slide-tabs";
import { subscribeRealtimeEvent } from "../../lib/realtime/realtimeBus";
import type { RealtimeEvent } from "../../lib/realtime/events";

type AppRole = "customer" | "technician" | "admin";
type ApiUserRole = "customer" | "worker" | "admin";

type AuthedUser = MeResponse["user"] & {
  user_role?: ApiUserRole;
  roles?: ApiUserRole[];
};

type TabKey =
  | "account"
  | "bookings"
  | "tech"
  | "admin_customers"
  | "admin_leads"
  | "admin_jobs"
  | "admin_jobhistory"
  | "admin_tech_bookings";

type Tab = { key: TabKey; label: string; icon: string; badgeCount?: number };

function normalizeRole(user: AuthedUser | null): AppRole {
  const primary = user?.user_role;

  if (primary === "admin") return "admin";
  if (primary === "worker") return "technician";
  if (primary === "customer") return "customer";

  const roles = user?.roles ?? [];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("worker")) return "technician";
  return "customer";
}

function incrementBadge(
  setTabBadges: React.Dispatch<React.SetStateAction<Record<TabKey, number>>>,
  key: TabKey
) {
  setTabBadges((prev) => ({
    ...prev,
    [key]: (prev[key] ?? 0) + 1,
  }));
}

export default function AccountShellPage() {
  const router = useRouter();
  const [role, setRole] = useState<AppRole>("customer");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tabBadges, setTabBadges] = useState<Record<TabKey, number>>({
    account: 0,
    bookings: 0,
    tech: 0,
    admin_customers: 0,
    admin_leads: 0,
    admin_jobs: 0,
    admin_jobhistory: 0,
    admin_tech_bookings: 0,
  });

  const [activeTab, setActiveTab] = useState<TabKey>("account");

  const tabs: Tab[] = useMemo(() => {
    const base: Tab[] = [{ key: "account", label: "Account", icon: "fa-regular fa-id-badge" }];

    if (role === "customer") {
      base.push({
        key: "bookings",
        label: "Bookings",
        icon: "fa-regular fa-calendar-check",
        badgeCount: tabBadges.bookings,
      });
      return base;
    }

    if (role === "technician") {
      base.push({
        key: "tech",
        label: "Technician",
        icon: "fa-solid fa-screwdriver-wrench",
        badgeCount: tabBadges.tech,
      });
      return base;
    }

    base.push(
      { key: "admin_customers", label: "Customers", icon: "fa-regular fa-user" },
      { key: "admin_leads", label: "Admin Booking", icon: "fa-solid fa-user-plus" },
      {
        key: "admin_jobs",
        label: "Jobs",
        icon: "fa-solid fa-briefcase",
        badgeCount: tabBadges.admin_jobs,
      },
      {
        key: "admin_jobhistory",
        label: "Completed",
        icon: "fa-regular fa-circle-check",
        badgeCount: tabBadges.admin_jobhistory,
      },
      {
        key: "admin_tech_bookings",
        label: "Tech Bookings",
        icon: "fa-solid fa-clipboard-list",
        badgeCount: tabBadges.admin_tech_bookings,
      }
    );

    return base;
  }, [
    role,
    tabBadges.bookings,
    tabBadges.tech,
    tabBadges.admin_jobs,
    tabBadges.admin_jobhistory,
    tabBadges.admin_tech_bookings,
  ]);

  function handleTabClick(key: TabKey) {
    setActiveTab(key);

    setTabBadges((prev) => ({
      ...prev,
      [key]: 0,
    }));
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await me();
        if (!alive) return;

        if (!res?.ok || !res.user) {
          setErr("Not authenticated");
          router.replace("/login");
          return;
        }

        const r = normalizeRole(res.user as AuthedUser);
        setRole(r);
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Not logged in";
        setErr(msg);
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!tabs.find((t) => t.key === activeTab)) {
      setActiveTab("account");
    }
  }, [tabs, activeTab]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvent((evt: RealtimeEvent) => {
      // Don't badge if user is currently viewing the relevant tab.
      if (role === "admin") {
        switch (evt.type) {
          case "booking.created":
          case "booking.accepted":
          case "booking.cancelled":
          case "booking.edited":
          case "message.new":
            if (activeTab !== "admin_jobs") {
              incrementBadge(setTabBadges, "admin_jobs");
            }
            break;

          case "booking.assigned":
          case "booking.reassigned":
          case "booking.price_set":
            if (activeTab !== "admin_tech_bookings") {
              incrementBadge(setTabBadges, "admin_tech_bookings");
            }
            break;

          case "booking.completed":
            if (activeTab !== "admin_jobhistory") {
              incrementBadge(setTabBadges, "admin_jobhistory");
            }
            break;

          default:
            break;
        }
      }

      if (role === "technician") {
        switch (evt.type) {
          case "booking.assigned":
          case "booking.reassigned":
          case "booking.cancelled":
          case "booking.price_set":
          case "message.new":
            if (activeTab !== "tech") {
              incrementBadge(setTabBadges, "tech");
            }
            break;

          default:
            break;
        }
      }

      if (role === "customer") {
        switch (evt.type) {
          case "booking.accepted":
          case "booking.assigned":
          case "booking.reassigned":
          case "booking.cancelled":
          case "booking.completed":
          case "booking.price_set":
          case "message.new":
          case "booking.edited":
            if (activeTab !== "bookings") {
              incrementBadge(setTabBadges, "bookings");
            }
            break;

          default:
            break;
        }
      }
    });

    return unsubscribe;
  }, [role, activeTab]);

  const slideTabs: Array<SlideTabItem<TabKey>> = useMemo(
    () =>
      tabs.map((t) => ({
        key: t.key,
        label: t.label,
        icon: t.icon,
        badgeCount: t.badgeCount,
      })),
    [tabs]
  );

  return (
    <main className="min-h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />

      <div className="mx-auto max-w-6xl px-3 py-6 space-y-4 sm:px-4 sm:py-8 md:py-10 md:space-y-6">
        {err ? (
          <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
            {err}
          </div>
        ) : null}

        <div className="w-full border-b pb-3 sm:pb-4" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <div className="min-w-max">
              <SlideTabs tabs={slideTabs} value={activeTab} onChange={handleTabClick} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-4 sm:p-5 md:p-6"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          {loading ? (
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Loading…
            </div>
          ) : (
            <>
              {activeTab === "account" && <AccountPage />}

              {role === "customer" && activeTab === "bookings" && <BookingsPage />}

              {role === "technician" && activeTab === "tech" && <TechnicianPage />}

              {role === "admin" && activeTab === "admin_customers" && <AdminCustomersPage />}
              {role === "admin" && activeTab === "admin_leads" && <AdminLeadsPage />}
              {role === "admin" && activeTab === "admin_jobs" && <AdminJobsPage />}
              {role === "admin" && activeTab === "admin_jobhistory" && <AdminJobHistoryPage />}
              {role === "admin" && activeTab === "admin_tech_bookings" && <TechBookingsPage />}
            </>
          )}
        </div>
      </div>
    </main>
  );
}