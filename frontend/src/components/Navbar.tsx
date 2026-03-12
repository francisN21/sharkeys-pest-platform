"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { me as apiMe } from "../lib/api/auth";
import {
  type AppNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/api/notifications";
import { subscribeRealtimeEvent } from "../lib/realtime/realtimeBus";
import type { RealtimeEvent } from "../lib/realtime/events";
import NotificationDropdown from "./notifications/NotificationDropdown";
import {
  notifyBrowser,
  requestBrowserNotificationPermission,
} from "../lib/notify";

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Home", href: "#home" },
  { label: "Booking", href: "#booking" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Blog", href: "/blog" },
  { label: "Service Area", href: "/service-area" },
];

type NavbarApiRole = "customer" | "worker" | "admin";
type NotificationViewerRole = "customer" | "technician" | "worker" | "admin";

type NavbarUser = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  user_role?: NavbarApiRole | null;
  roles?: NavbarApiRole[] | null;
};

const BROWSER_NOTIFY_PREF_KEY = "spc_browser_notifications_enabled";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "U";
}

function displayName(user: {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}) {
  const first = (user.first_name || "").trim();
  const last = (user.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || user.email;
}

function normalizeViewerRole(user: NavbarUser | null): NotificationViewerRole | null {
  if (!user) return null;

  if (user.user_role === "admin") return "admin";
  if (user.user_role === "worker") return "worker";
  if (user.user_role === "customer") return "customer";

  const roles = user.roles ?? [];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("worker")) return "worker";
  if (roles.includes("customer")) return "customer";

  return null;
}

function mapRealtimeEventToPreview(evt: RealtimeEvent): AppNotification | null {
  const now = new Date().toISOString();

  switch (evt.type) {
    case "booking.created":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "New booking created",
        body: evt.bookingName ?? `Booking ${evt.bookingId}`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.startsAt ?? now,
      };

    case "booking.accepted":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking accepted",
        body: `Booking ${evt.bookingId} has been accepted.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.acceptedAt ?? now,
      };

    case "booking.assigned":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking assigned",
        body: `Booking ${evt.bookingId} has been assigned.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.assignedAt ?? now,
      };

    case "booking.reassigned":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking reassigned",
        body: `Booking ${evt.bookingId} has a new technician.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.assignedAt ?? now,
      };

    case "booking.cancelled":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking cancelled",
        body: `Booking ${evt.bookingId} has been cancelled.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.cancelledAt ?? now,
      };

    case "booking.edited":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking updated",
        body: `Booking ${evt.bookingId} was updated.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.startsAt ?? now,
      };

    case "booking.completed":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking completed",
        body:
          `Booking ${evt.bookingId}` +
          (evt.technicianName ? ` by ${evt.technicianName}` : "") +
          (typeof evt.finalPriceCents === "number"
            ? ` • $${(evt.finalPriceCents / 100).toFixed(2)}`
            : ""),
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.completedAt ?? now,
      };

    case "booking.price_set":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Final price updated",
        body:
          `Booking ${evt.bookingId}` +
          (typeof evt.finalPriceCents === "number"
            ? ` • $${(evt.finalPriceCents / 100).toFixed(2)}`
            : ""),
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.setAt ?? now,
      };

    case "message.new":
      return {
        id: Date.now(),
        kind: evt.type,
        title: evt.fromName ? `New message from ${evt.fromName}` : "New message",
        body: evt.snippet ?? "You received a new message.",
        booking_id: null,
        booking_public_id: evt.threadId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.at ?? now,
      };

    case "system.error":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "System error",
        body: evt.message,
        booking_id: null,
        booking_public_id: null,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.at ?? now,
      };

    default:
      return null;
  }
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const { user, loading, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  const [resolvedUser, setResolvedUser] = useState<NavbarUser | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");

  const effectiveUser = (user as NavbarUser | null) ?? resolvedUser;
  const isAuthed = !!effectiveUser;
  const viewerRole = useMemo(
    () => normalizeViewerRole(effectiveUser),
    [effectiveUser]
  );

  const name = useMemo(
    () => (effectiveUser ? displayName(effectiveUser) : ""),
    [effectiveUser]
  );
  const initials = useMemo(() => (name ? getInitials(name) : "U"), [name]);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setBrowserNotifPermission("unsupported");
      setBrowserNotifEnabled(false);
      return;
    }

    setBrowserNotifPermission(Notification.permission);
    const saved = window.localStorage.getItem(BROWSER_NOTIFY_PREF_KEY);
    setBrowserNotifEnabled(saved === "true" && Notification.permission === "granted");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshMe() {
      try {
        const res = await apiMe();
        if (cancelled) return;

        if (res?.ok && res.user) {
          setResolvedUser(res.user as NavbarUser);
        } else {
          setResolvedUser(null);
        }
      } catch {
        if (!cancelled) setResolvedUser(null);
      }
    }

    if (!loading && user) {
      setResolvedUser(user as NavbarUser);
      return;
    }

    if (!loading && !user) {
      void refreshMe();
    }

    function onFocus() {
      if (!loading && !user) {
        void refreshMe();
      }

      if (typeof window !== "undefined" && "Notification" in window) {
        setBrowserNotifPermission(Notification.permission);
        const saved = window.localStorage.getItem(BROWSER_NOTIFY_PREF_KEY);
        setBrowserNotifEnabled(saved === "true" && Notification.permission === "granted");
      }
    }

    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [loading, user, pathname]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;

      if (hamburgerRef.current && hamburgerRef.current.contains(t)) return;

      if (menuOpen && menuRef.current && !menuRef.current.contains(t)) {
        setMenuOpen(false);
      }
      if (accountOpen && accountRef.current && !accountRef.current.contains(t)) {
        setAccountOpen(false);
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(t)) {
        setNotifOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen, accountOpen, notifOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    let alive = true;

    async function loadNotifications() {
      if (!isAuthed) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        setNotifLoading(true);

        const [listRes, unreadRes] = await Promise.all([
          listNotifications(12, false),
          getUnreadNotificationCount(),
        ]);

        if (!alive) return;

        setNotifications(Array.isArray(listRes.notifications) ? listRes.notifications : []);
        setUnreadCount(unreadRes.unread_count ?? 0);
      } catch {
        if (!alive) return;
      } finally {
        if (alive) setNotifLoading(false);
      }
    }

    void loadNotifications();

    return () => {
      alive = false;
    };
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed) return;

    const unsubscribe = subscribeRealtimeEvent((evt: RealtimeEvent) => {
      const preview = mapRealtimeEventToPreview(evt);
      if (!preview) return;

      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [preview, ...prev].slice(0, 12));

      if (browserNotifEnabled) {
        void notifyBrowser(preview.title, preview.body ?? "");
      }
    });

    return unsubscribe;
  }, [isAuthed, browserNotifEnabled]);

  function onNavClick(href: string) {
    setMenuOpen(false);

    if (href.startsWith("#")) {
      if (pathname !== "/") {
        router.push(`/${href}`);
        return;
      }

      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    router.push(href);
  }

  async function onLogout() {
    setAccountOpen(false);
    setMenuOpen(false);
    setNotifOpen(false);

    try {
      await logout();
    } finally {
      setResolvedUser(null);
      setNotifications([]);
      setUnreadCount(0);
      router.push("/login");
    }
  }

  async function onOpenNotifications() {
    const next = !notifOpen;
    setNotifOpen(next);
    setAccountOpen(false);

    if (!next || !isAuthed) return;

    try {
      setNotifLoading(true);
      const listRes = await listNotifications(12, false);
      setNotifications(Array.isArray(listRes.notifications) ? listRes.notifications : []);
    } catch {
      // ignore
    } finally {
      setNotifLoading(false);
    }
  }

  async function onToggleBrowserNotifications() {
    if (browserNotifEnabled) {
      localStorage.setItem(BROWSER_NOTIFY_PREF_KEY, "false");
      setBrowserNotifEnabled(false);

      if (typeof window !== "undefined" && "Notification" in window) {
        setBrowserNotifPermission(Notification.permission);
      }
      return;
    }

    const permission = await requestBrowserNotificationPermission();
    setBrowserNotifPermission(permission);

    if (permission === "granted") {
      localStorage.setItem(BROWSER_NOTIFY_PREF_KEY, "true");
      setBrowserNotifEnabled(true);
    } else {
      localStorage.setItem(BROWSER_NOTIFY_PREF_KEY, "false");
      setBrowserNotifEnabled(false);
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at ?? new Date().toISOString(),
        }))
      );
    } catch {
      // ignore
    }
  }

  async function onNotificationClick(item: AppNotification) {
    try {
      if (!item.read_at) {
        await markNotificationRead(item.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, read_at: n.read_at ?? new Date().toISOString() }
              : n
          )
        );
      }
    } catch {
      // ignore
    }

    setNotifOpen(false);
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgba(var(--bg), 0.88)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/main-logo.jpg"
            alt="Sharkys Pest Control"
            width={52}
            height={52}
            priority
            className="rounded-lg"
          />
          <div className="leading-tight">
            <div className="text-base font-semibold">Sharkys Pest Control</div>
            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Bay Area
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm hover:opacity-90"
              style={{ color: "rgb(var(--muted))" }}
              onClick={(e) => {
                e.preventDefault();
                onNavClick(n.href);
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/sharkeys-pest-control-booking"
              className="rounded-xl px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
              style={{
                background: "rgb(59 130 246)",
                color: "white",
              }}
            >
              Book a Service
            </Link>

            {!loading && !isAuthed ? (
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90"
                style={{ color: "rgb(var(--muted))" }}
              >
                Sign in
              </Link>
            ) : null}
          </div>

          {!loading && isAuthed ? (
            <div className="relative shrink-0" ref={notifRef}>
              <button
                type="button"
                onClick={() => void onOpenNotifications()}
                className="relative rounded-xl border p-2.5 shadow-sm hover:opacity-90"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--card))",
                }}
                aria-label="Notifications"
                aria-haspopup="menu"
                aria-expanded={notifOpen}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span
                    className="absolute -right-1 -top-1 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold"
                    style={{
                      background: "rgb(239 68 68)",
                      color: "white",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>

              <NotificationDropdown
                open={notifOpen}
                loading={notifLoading}
                notifications={notifications}
                unreadCount={unreadCount}
                viewerRole={viewerRole}
                onMarkAllRead={onMarkAllRead}
                onNotificationClick={onNotificationClick}
                browserNotifEnabled={browserNotifEnabled}
                browserNotifPermission={browserNotifPermission}
                onToggleBrowserNotifications={onToggleBrowserNotifications}
              />
            </div>
          ) : null}

          {!loading && isAuthed ? (
            <div className="relative hidden md:block" ref={accountRef}>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--card))",
                }}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                  aria-hidden="true"
                  title={name}
                >
                  {initials}
                </span>
                <ChevronDown
                  className="h-4 w-4"
                  style={{ color: "rgb(var(--muted))" }}
                />
              </button>

              {accountOpen ? (
                <div
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border shadow-sm"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--card))",
                  }}
                  role="menu"
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid rgb(var(--border))" }}
                  >
                    <div className="truncate text-sm font-semibold">{name}</div>
                    <div
                      className="mt-1 text-xs"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Signed in
                    </div>
                  </div>

                  <button
                    className="w-full px-4 py-3 text-left text-sm font-semibold hover:opacity-90"
                    style={{ color: "rgb(var(--fg))" }}
                    onClick={() => {
                      setAccountOpen(false);
                      router.push("/account");
                    }}
                    role="menuitem"
                  >
                    Account
                  </button>

                  <button
                    className="w-full px-4 py-3 text-left text-sm font-semibold hover:opacity-90"
                    style={{
                      color: "rgb(var(--fg))",
                      borderTop: "1px solid rgb(var(--border))",
                    }}
                    onClick={() => void onLogout()}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            ref={hamburgerRef}
            type="button"
            className="shrink-0 rounded-xl border p-2.5 shadow-sm hover:opacity-90 md:hidden"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--card))",
            }}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <div className="relative h-5 w-5">
              <span
                className={[
                  "absolute left-0 top-[4px] h-[2px] w-5 transition-transform",
                  menuOpen ? "translate-y-[6px] rotate-45" : "",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
              <span
                className={[
                  "absolute left-0 top-[10px] h-[2px] w-5 transition-opacity",
                  menuOpen ? "opacity-0" : "opacity-100",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
              <span
                className={[
                  "absolute left-0 top-[16px] h-[2px] w-5 transition-transform",
                  menuOpen ? "translate-y-[-6px] -rotate-45" : "",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
            </div>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          className="border-t md:hidden"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgba(var(--bg), 0.96)",
          }}
        >
          <div ref={menuRef} className="mx-auto max-w-6xl space-y-4 px-4 py-4">
            <div className="grid gap-2">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="rounded-xl px-3 py-3 text-sm font-semibold hover:opacity-90"
                  style={{
                    background: "rgb(var(--card))",
                    color: "rgb(var(--fg))",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick(n.href);
                  }}
                >
                  {n.label}
                </a>
              ))}
            </div>

            <Link
              href="/sharkeys-pest-control-booking"
              className="block rounded-xl px-3 py-3 text-center text-sm font-semibold shadow-sm hover:opacity-90"
              style={{
                background: "rgb(59 130 246)",
                color: "white",
              }}
              onClick={() => setMenuOpen(false)}
            >
              Book a Service
            </Link>

            {!loading && !isAuthed ? (
              <div className="grid gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border px-3 py-3 text-center text-sm font-semibold hover:opacity-90"
                  style={{
                    borderColor: "rgb(var(--border))",
                    color: "rgb(var(--fg))",
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>

                <Link
                  href="/signup"
                  className="rounded-xl border px-3 py-3 text-center text-sm font-semibold hover:opacity-90"
                  style={{
                    borderColor: "rgb(var(--border))",
                    color: "rgb(var(--fg))",
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            ) : null}

            {!loading && isAuthed ? (
              <div className="grid gap-2">
                <div
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--card))",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{name}</div>
                      <div
                        className="mt-1 text-xs"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        Signed in
                      </div>
                    </div>

                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      {initials}
                    </div>
                  </div>
                </div>

                <button
                  className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--card))",
                  }}
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/account");
                  }}
                >
                  Account
                </button>

                <button
                  className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--card))",
                  }}
                  onClick={() => void onToggleBrowserNotifications()}
                  disabled={
                    browserNotifPermission === "unsupported" ||
                    browserNotifPermission === "denied"
                  }
                >
                  Browser Alerts {browserNotifEnabled ? "On" : "Off"}
                </button>

                <button
                  className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--card))",
                  }}
                  onClick={() => void onLogout()}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}