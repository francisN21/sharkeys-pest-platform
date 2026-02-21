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

type Tab = { key: TabKey; label: string; icon: string };

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

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AccountShellPage() {
  const router = useRouter();

  const [data, setData] = useState<MeResponse | null>(null);
  const [role, setRole] = useState<AppRole>("customer");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      { key: "admin_leads", label: "Leads", icon: "fa-solid fa-user-plus" },
      { key: "admin_jobs", label: "Jobs", icon: "fa-solid fa-briefcase" },
      { key: "admin_jobhistory", label: "Completed", icon: "fa-regular fa-circle-check" },
      { key: "admin_tech_bookings", label: "Tech Bookings", icon: "fa-solid fa-clipboard-list" }
    );

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
    if (!tabs.find((t) => t.key === activeTab)) setActiveTab("account");
  }, [tabs, activeTab]);

  return (
    <main className="h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        {err ? (
          <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
            {err}
          </div>
        ) : null}
        {/* tabs bar */}
        <div className="w-full border-b" style={{ borderColor: "rgb(var(--border))" }}>
          <nav className="flex flex-wrap items-center gap-2 -mb-px" aria-label="Account navigation">
            {tabs.map((t) => (
              <GithubTab
                key={t.key}
                label={t.label}
                icon={t.icon}
                active={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
              />
            ))}
          </nav>
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

function GithubTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition",
        "rounded-t-lg",
        active ? "border-blue-500" : "border-transparent hover:border-[rgb(var(--border))]"
      )}
      style={{
        color: active ? "rgb(var(--fg))" : "rgb(var(--muted))",
        background: "transparent",
      }}
      aria-current={active ? "page" : undefined}
    >
      <i className={cn(icon, "text-[13px]", active ? "" : "opacity-80")} aria-hidden="true" />
      <span className={cn(active ? "text-[rgb(var(--fg))]" : "group-hover:text-[rgb(var(--fg))]")}>{label}</span>
    </button>
  );
}