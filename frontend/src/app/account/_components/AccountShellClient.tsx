"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { me } from "../../../lib/api/auth";
import { subscribeRealtimeEvent } from "../../../lib/realtime/realtimeBus";
import type { RealtimeEvent } from "../../../lib/realtime/events";
import AccountRouteTabs, {
  DEFAULT_PULSING_TABS,
  DEFAULT_TAB_BADGES,
  getTabKeyFromPathname,
  type AppRole,
  type AuthedUser,
  type TabKey,
} from "../_components/account-route-tabs";

const BADGES_STORAGE_KEY = "account-route-tab-badges:v1";
const PULSES_STORAGE_KEY = "account-route-tab-pulses:v1";

function normalizeRole(user: AuthedUser | null): AppRole {
  const primary = user?.user_role;

  if (primary === "superuser") return "superuser";
  if (primary === "admin") return "admin";
  if (primary === "worker") return "technician";
  if (primary === "customer") return "customer";

  const roles = user?.roles ?? [];
  if (roles.includes("superuser")) return "superuser";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("worker")) return "technician";
  return "customer";
}

function readStoredBadges(): Record<TabKey, number> {
  if (typeof window === "undefined") return DEFAULT_TAB_BADGES;

  try {
    const raw = window.sessionStorage.getItem(BADGES_STORAGE_KEY);
    if (!raw) return DEFAULT_TAB_BADGES;

    const parsed = JSON.parse(raw) as Partial<Record<TabKey, number>>;

    return {
      ...DEFAULT_TAB_BADGES,
      ...parsed,
    };
  } catch {
    return DEFAULT_TAB_BADGES;
  }
}

function readStoredPulses(): Record<TabKey, boolean> {
  if (typeof window === "undefined") return DEFAULT_PULSING_TABS;

  try {
    const raw = window.sessionStorage.getItem(PULSES_STORAGE_KEY);
    if (!raw) return DEFAULT_PULSING_TABS;

    const parsed = JSON.parse(raw) as Partial<Record<TabKey, boolean>>;

    return {
      ...DEFAULT_PULSING_TABS,
      ...parsed,
    };
  } catch {
    return DEFAULT_PULSING_TABS;
  }
}

function getNotificationTargetTab(role: AppRole, evt: RealtimeEvent): TabKey | null {
  if (role === "admin" || role === "superuser") {
    switch (evt.type) {
      case "booking.created":
      case "booking.accepted":
      case "booking.cancelled":
      case "booking.edited":
      case "message.new":
        return "admin_dispatch";

      case "booking.assigned":
      case "booking.reassigned":
      case "booking.price_set":
        return "admin_tech_bookings";

      case "booking.completed":
        return "admin_jobhistory";

      default:
        return null;
    }
  }

  if (role === "technician") {
    switch (evt.type) {
      case "booking.assigned":
      case "booking.reassigned":
      case "booking.cancelled":
      case "booking.price_set":
      case "message.new":
        return "tech";

      default:
        return null;
    }
  }

  switch (evt.type) {
    case "booking.accepted":
    case "booking.assigned":
    case "booking.reassigned":
    case "booking.cancelled":
    case "booking.completed":
    case "booking.price_set":
    case "message.new":
    case "booking.edited":
      return "bookings";

    default:
      return null;
  }
}

function getAccountHeaderMeta(role: AppRole) {
  switch (role) {
    case "superuser":
      return {
        title: "Owner Account",
        subtitle: "Sharkys Pest Control · Bay Area · Account & CRM",
        icon: "fa-solid fa-user-shield",
      };

    case "admin":
      return {
        title: "Admin Account",
        subtitle: "Sharkys Pest Control · Bay Area · Dispatch & Operations",
        icon: "fa-solid fa-briefcase",
      };

    case "technician":
      return {
        title: "Technician Account",
        subtitle: "Sharkys Pest Control · Bay Area · Field Schedule & Jobs",
        icon: "fa-solid fa-screwdriver-wrench",
      };

    case "customer":
    default:
      return {
        title: "My Account",
        subtitle: "Sharkys Pest Control · Bay Area · Bookings & Messages",
        icon: "fa-solid fa-user",
      };
  }
}

export default function AccountShellClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<AppRole>("customer");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tabBadges, setTabBadges] = useState<Record<TabKey, number>>(DEFAULT_TAB_BADGES);
  const [pulsingTabs, setPulsingTabs] =
    useState<Record<TabKey, boolean>>(DEFAULT_PULSING_TABS);

  const activeTab = useMemo(() => getTabKeyFromPathname(pathname), [pathname]);
  const headerMeta = useMemo(() => getAccountHeaderMeta(role), [role]);

  useEffect(() => {
    setTabBadges(readStoredBadges());
    setPulsingTabs(readStoredPulses());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(tabBadges));
  }, [tabBadges]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(PULSES_STORAGE_KEY, JSON.stringify(pulsingTabs));
  }, [pulsingTabs]);

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

        setRole(normalizeRole(res.user as AuthedUser));
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
    if (!activeTab) return;

    setTabBadges((prev) => {
      if ((prev[activeTab] ?? 0) === 0) return prev;
      return { ...prev, [activeTab]: 0 };
    });

    setPulsingTabs((prev) => {
      if (!prev[activeTab]) return prev;
      return { ...prev, [activeTab]: false };
    });
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvent((evt: RealtimeEvent) => {
      const targetTab = getNotificationTargetTab(role, evt);
      if (!targetTab) return;
      if (targetTab === activeTab) return;

      setTabBadges((prev) => ({
        ...prev,
        [targetTab]: (prev[targetTab] ?? 0) + 1,
      }));

      setPulsingTabs((prev) => ({
        ...prev,
        [targetTab]: true,
      }));
    });

    return unsubscribe;
  }, [role, activeTab]);

  return (
    <main className="min-h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />

      {/* Page header */}
      <div
        className="border-b"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--card))",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(var(--fg), 0.05)",
                }}
              >
                <i
                  className={`${headerMeta.icon} text-sm`}
                  style={{ color: "rgb(var(--muted))" }}
                />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight">{headerMeta.title}</h1>
                <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  {headerMeta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: "rgba(16,185,129,0.3)",
                  background: "rgba(16,185,129,0.08)",
                  color: "rgb(16,185,129)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "transparent",
                }}
              >
                ← Back to Home
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            <div className="min-w-max">
              <AccountRouteTabs
                role={role}
                pathname={pathname}
                tabBadges={tabBadges}
                pulsingTabs={pulsingTabs}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-3 py-6 space-y-4 sm:px-4 sm:py-8 md:py-10 md:space-y-6">
        {err ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "rgb(239 68 68)" }}
          >
            {err}
          </div>
        ) : null}

        <div
          className="rounded-2xl border p-4 sm:p-5 md:p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          {loading ? (
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Loading…
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </main>
  );
}