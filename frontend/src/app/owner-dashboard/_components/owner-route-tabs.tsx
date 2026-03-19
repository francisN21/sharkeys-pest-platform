"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { SlideTabs, type SlideTabItem } from "../../../components/ui/slide-tabs";

export type OwnerTabKey = "dashboard" | "employees";

type RouteTab = {
  key: OwnerTabKey;
  label: string;
  icon: string;
  href: string;
};

function getOwnerTabs(): RouteTab[] {
  return [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: "fa-solid fa-chart-line",
      href: "/owner-dashboard",
    },
    {
      key: "employees",
      label: "Employees",
      icon: "fa-solid fa-user-gear",
      href: "/owner-dashboard/employees",
    },
  ];
}

export function getOwnerTabKeyFromPathname(pathname: string | null): OwnerTabKey {
  const path = pathname ?? "/owner-dashboard";

  if (path.startsWith("/owner-dashboard/employees")) return "employees";
  return "dashboard";
}

export default function OwnerRouteTabs({
  pathname,
  loading,
}: {
  pathname: string | null;
  loading?: boolean;
}) {
  const router = useRouter();

  const tabs = useMemo(() => getOwnerTabs(), []);
  const activeTab = useMemo(() => getOwnerTabKeyFromPathname(pathname), [pathname]);

  const slideTabs: Array<SlideTabItem<OwnerTabKey>> = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        icon: tab.icon,
      })),
    [tabs]
  );

  function handleTabChange(key: OwnerTabKey) {
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