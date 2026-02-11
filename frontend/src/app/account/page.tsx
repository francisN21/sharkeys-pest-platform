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
import { me, type MeResponse } from "../../lib/api/auth";

type AppRole = "customer" | "technician" | "admin";
type ApiUserRole = "customer" | "worker" | "admin";

type AuthedUser = MeResponse["user"] & {
  // your /auth/me returns these now
  user_role?: ApiUserRole;
  roles?: ApiUserRole[]; // could be string[] in your type; we treat it safely
};

type TabKey =
  | "account"
  | "bookings"
  | "tech"
  | "admin_customers"
  | "admin_jobs"
  | "admin_jobhistory";

type Tab = { key: TabKey; label: string };

function normalizeRole(user: AuthedUser | null): AppRole {
  // Prefer primary role
  const primary = user?.user_role;

  if (primary === "admin") return "admin";
  if (primary === "worker") return "technician";
  if (primary === "customer") return "customer";

  // Fallback to roles array (just in case)
  const roles = user?.roles ?? [];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("worker")) return "technician";
  return "customer";
}

export default function AccountShellPage() {
  const router = useRouter();

  const [data, setData] = useState<MeResponse | null>(null);
  const [role, setRole] = useState<AppRole>("customer");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tabs: Tab[] = useMemo(() => {
    const base: Tab[] = [
      { key: "account", label: "Account" },
      { key: "bookings", label: "Bookings" },
    ];

    // technician portal tab (technician + admin)
    if (role === "technician") {
      base.push({ key: "tech", label: "Technician" });
    }

    // admin tabs
    if (role === "admin") {
      base.push(
        { key: "admin_customers", label: "Customers" },
        { key: "admin_jobs", label: "Jobs" },
        { key: "admin_jobhistory", label: "Completed" }
      );
    }

    return base;
  }, [role]);

  const [activeTab, setActiveTab] = useState<TabKey>("account");

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

        setData(res);

        // ✅ role gate based on user_role/roles from backend
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

  // keep activeTab valid when role/tabs change
  useEffect(() => {
    if (!tabs.find((t) => t.key === activeTab)) {
      setActiveTab("account");
    }
  }, [tabs, activeTab]);

  return (
    <main className="h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        {err ? (
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
            {err}
          </div>
        ) : null}

        <div className="inline-flex rounded-lg shadow-sm -space-x-px" role="group">
          {tabs.map((t, idx) => (
            <TabButton
              key={t.key}
              label={t.label}
              active={activeTab === t.key}
              position={idx === 0 ? "first" : idx === tabs.length - 1 ? "last" : "middle"}
              onClick={() => setActiveTab(t.key)}
            />
          ))}
        </div>

        <div className="w-full max-w-3xl rounded-xl shadow p-6" style={{ background: "rgb(var(--card))" }}>
          {loading ? (
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Loading…
            </div>
          ) : (
            <>
              {activeTab === "account" && <AccountPage />}
              {activeTab === "bookings" && <BookingsPage />}

              {(role === "technician" || role === "admin") && activeTab === "tech" && <TechnicianPage />}

              {role === "admin" && activeTab === "admin_customers" && <AdminCustomersPage />}
              {role === "admin" && activeTab === "admin_jobs" && <AdminJobsPage />}
              {role === "admin" && activeTab === "admin_jobhistory" && <AdminJobHistoryPage />}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function TabButton({
  label,
  active,
  position,
  onClick,
}: {
  label: string;
  active: boolean;
  position: "first" | "middle" | "last";
  onClick: () => void;
}) {
  const rounded = position === "first" ? "rounded-l-lg" : position === "last" ? "rounded-r-lg" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 text-sm font-medium leading-5 border focus:outline-none focus:ring-2 focus:ring-blue-500",
        rounded,
        active ? "bg-blue-600 text-white border-blue-600 z-10" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </button>
  );
}