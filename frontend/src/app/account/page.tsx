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

export default function AccountShellPage() {
  const router = useRouter();
  const [role, setRole] = useState<AppRole>("customer");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Notification counts (tabs badge)
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

  const tabs: Tab[] = useMemo(() => {
    const base: Tab[] = [{ key: "account", label: "Account", icon: "fa-regular fa-id-badge" }];

    if (role === "customer") {
      base.push({ key: "bookings", label: "Bookings", icon: "fa-regular fa-calendar-check" });
      return base;
    }

    if (role === "technician") {
      base.push({ key: "tech", label: "Technician", icon: "fa-solid fa-screwdriver-wrench" });
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
      { key: "admin_jobhistory", label: "Completed", icon: "fa-regular fa-circle-check" },
      {
        key: "admin_tech_bookings",
        label: "Tech Bookings",
        icon: "fa-solid fa-clipboard-list",
        badgeCount: tabBadges.admin_tech_bookings,
      }
    );

    return base;
  }, [role, tabBadges.admin_jobs, tabBadges.admin_tech_bookings]);

  const [activeTab, setActiveTab] = useState<TabKey>("account");

  function handleTabClick(key: TabKey) {
    setActiveTab(key);

    // Mark as seen when user opens the tab
    if (key === "admin_jobs" || key === "admin_tech_bookings") {
      setTabBadges((prev) => ({ ...prev, [key]: 0 }));
    }
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

        // Optional: quick demo badges for admin (remove when wiring real counts)
        if (r === "admin") {
          setTabBadges((prev) => ({
            ...prev,
            admin_jobs: prev.admin_jobs || 0,
            admin_tech_bookings: prev.admin_tech_bookings || 0,
          }));
        }
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
    if (!tabs.find((t) => t.key === activeTab)) setActiveTab("account");
  }, [tabs, activeTab]);

  // Adapt your tabs into SlideTabs items (same keys/labels/icons/badges)
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
    <main className="h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        {err ? (
          <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
            {err}
          </div>
        ) : null}

        {/* Slide tabs bar */}
        <div className="w-full border-b pb-4" style={{ borderColor: "rgb(var(--border))" }}>
          <SlideTabs tabs={slideTabs} value={activeTab} onChange={handleTabClick} />
        </div>

        {/* Content card */}
        <div
          className="rounded-2xl border p-6"
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