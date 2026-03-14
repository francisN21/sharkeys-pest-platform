import type { NavItem } from "./navbar.types";

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "#home" },
  { label: "Booking", href: "#booking" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Blog", href: "/blog" },
  { label: "Service Area", href: "/service-area" },
];

export const BROWSER_NOTIFY_PREF_KEY = "spc_browser_notifications_enabled";