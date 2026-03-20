"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { SlideTabs, type SlideTabItem } from "../../../components/ui/slide-tabs";
import type { MeResponse } from "../../../lib/api/auth";

export type AppRole = "customer" | "technician" | "admin" | "superuser";
export type ApiUserRole = "customer" | "worker" | "admin" | "superuser";

export type AuthedUser = MeResponse["user"] & {
  user_role?: ApiUserRole;
  roles?: ApiUserRole[];
};

export type TabKey =
  | "account"
  | "bookings"
  | "tech"
  | "admin_customers"
  | "admin_availability"
  | "admin_leads"
  | "admin_dispatch"
  | "admin_jobhistory"
  | "admin_tech_bookings";

type RouteTab = {
  key: TabKey;
  label: string;
  icon: string;
  href: string;
  badgeCount?: number;
  pulseBadge?: boolean;
};

export const DEFAULT_TAB_BADGES: Record<TabKey, number> = {
  account: 0,
  bookings: 0,
  tech: 0,
  admin_customers: 0,
  admin_availability: 0,
  admin_leads: 0,
  admin_dispatch: 0,
  admin_jobhistory: 0,
  admin_tech_bookings: 0,
};

export const DEFAULT_PULSING_TABS: Record<TabKey, boolean> = {
  account: false,
  bookings: false,
  tech: false,
  admin_customers: false,
  admin_availability: false,
  admin_leads: false,
  admin_dispatch: false,
  admin_jobhistory: false,
  admin_tech_bookings: false,
};

export function getTabKeyFromPathname(pathname: string | null): TabKey {
  const path = pathname ?? "/account";

  if (path === "/account" || path === "/account/profile") return "account";
  if (path.startsWith("/account/bookings")) return "bookings";
  if (path.startsWith("/account/technician")) return "tech";
  if (path.startsWith("/account/admin/customers")) return "admin_customers";
  if (path.startsWith("/account/admin/availability")) return "admin_availability";
  if (path.startsWith("/account/admin/leads")) return "admin_leads";
  if (path.startsWith("/account/admin/dispatch")) return "admin_dispatch";
  if (path.startsWith("/account/admin/jobhistory")) return "admin_jobhistory";
  if (path.startsWith("/account/techbookings")) return "admin_tech_bookings";

  return "account";
}

function buildTabs(
  role: AppRole,
  tabBadges: Record<TabKey, number>,
  pulsingTabs: Record<TabKey, boolean>
): RouteTab[] {
  const base: RouteTab[] = [
    {
      key: "account",
      label: "Account",
      icon: "fa-regular fa-id-badge",
      href: "/account",
      badgeCount: tabBadges.account,
      pulseBadge: pulsingTabs.account,
    },
  ];

  if (role === "customer") {
    base.push({
      key: "bookings",
      label: "Bookings",
      icon: "fa-regular fa-calendar-check",
      href: "/account/bookings",
      badgeCount: tabBadges.bookings,
      pulseBadge: pulsingTabs.bookings,
    });

    return base;
  }

  if (role === "technician") {
    base.push({
      key: "tech",
      label: "Technician",
      icon: "fa-solid fa-screwdriver-wrench",
      href: "/account/technician",
      badgeCount: tabBadges.tech,
      pulseBadge: pulsingTabs.tech,
    });

    return base;
  }

  base.push(
    {
      key: "admin_customers",
      label: "Customers",
      icon: "fa-regular fa-user",
      href: "/account/admin/customers",
      badgeCount: tabBadges.admin_customers,
      pulseBadge: pulsingTabs.admin_customers,
    },
    {
      key: "admin_availability",
      label: "Availability",
      icon: "fa-solid fa-calendar",
      href: "/account/admin/availability",
      badgeCount: tabBadges.admin_availability,
      pulseBadge: pulsingTabs.admin_availability,
    },
    {
      key: "admin_leads",
      label: "Admin Booking",
      icon: "fa-solid fa-user-plus",
      href: "/account/admin/leads",
      badgeCount: tabBadges.admin_leads,
      pulseBadge: pulsingTabs.admin_leads,
    },
    {
      key: "admin_dispatch",
      label: "Dispatch",
      icon: "fa-solid fa-briefcase",
      href: "/account/admin/dispatch",
      badgeCount: tabBadges.admin_dispatch,
      pulseBadge: pulsingTabs.admin_dispatch,
    },
    {
      key: "admin_jobhistory",
      label: "Completed",
      icon: "fa-regular fa-circle-check",
      href: "/account/admin/jobhistory",
      badgeCount: tabBadges.admin_jobhistory,
      pulseBadge: pulsingTabs.admin_jobhistory,
    },
    {
      key: "admin_tech_bookings",
      label: "Tech Bookings",
      icon: "fa-solid fa-clipboard-list",
      href: "/account/techbookings",
      badgeCount: tabBadges.admin_tech_bookings,
      pulseBadge: pulsingTabs.admin_tech_bookings,
    }
  );

  return base;
}

export default function AccountRouteTabs({
  role,
  pathname,
  tabBadges,
  pulsingTabs,
  loading,
}: {
  role: AppRole;
  pathname: string | null;
  tabBadges: Record<TabKey, number>;
  pulsingTabs: Record<TabKey, boolean>;
  loading?: boolean;
}) {
  const router = useRouter();

  const tabs = useMemo(
    () => buildTabs(role, tabBadges, pulsingTabs),
    [role, tabBadges, pulsingTabs]
  );

  const activeTab = useMemo(() => getTabKeyFromPathname(pathname), [pathname]);

  const slideTabs: Array<SlideTabItem<TabKey>> = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        icon: tab.icon,
        badgeCount: tab.badgeCount,
        pulseBadge: tab.pulseBadge,
      })),
    [tabs]
  );

  function handleTabChange(key: TabKey) {
    const target = tabs.find((tab) => tab.key === key);
    if (!target) return;

    if (pathname === target.href) return;
    router.push(target.href);
  }

  if (loading) {
    return (
      <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
        Loading tabs…
      </div>
    );
  }

  return <SlideTabs tabs={slideTabs} value={activeTab} onChange={handleTabChange} />;
}