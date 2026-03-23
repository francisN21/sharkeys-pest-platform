"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import {
  type AppNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/api/notifications";
import { subscribeRealtimeEvent } from "../lib/realtime/realtimeBus";
import type { RealtimeEvent } from "../lib/realtime/events";
import { notifyBrowser, requestBrowserNotificationPermission } from "../lib/notify";
import NavbarNotifications from "./navbar/NavbarNotifications";
import NavbarAccountMenu from "./navbar/NavbarAccountMenu";
import NavbarMobileMenu from "./navbar/NavbarMobileMenu";
import { BROWSER_NOTIFY_PREF_KEY, NAV_ITEMS } from "./navbar/navbar.constants";
import { displayName, getInitials, mapRealtimeEventToPreview, normalizeViewerRole } from "./navbar/navbar.utils";
import type { NavbarUser } from "./navbar/navbar.types";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");

  const effectiveUser = (user as NavbarUser | null) ?? null;
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
    function onFocus() {
      if (typeof window !== "undefined" && "Notification" in window) {
        setBrowserNotifPermission(Notification.permission);
        const saved = window.localStorage.getItem(BROWSER_NOTIFY_PREF_KEY);
        setBrowserNotifEnabled(saved === "true" && Notification.permission === "granted");
      }
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

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

  function onToggleAccountMenu() {
    setAccountOpen((v) => !v);
    setNotifOpen(false);
  }

  function onAccount() {
    setAccountOpen(false);
    setMenuOpen(false);
    router.push("/account");
  }

  function onCloseMenu() {
    setMenuOpen(false);
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
          {NAV_ITEMS.map((n) => (
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
              href="/sharkys-pest-control-booking"
              className="rounded-xl px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
              style={{
                background: "rgb(59 130 246)",
                color: "white",
              }}
            >
              Book a Service
            </Link>

            {!isAuthed ? (
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90"
                style={{ color: "rgb(var(--muted))" }}
              >
                Sign in
              </Link>
            ) : null}
          </div>

          <NavbarNotifications
            isAuthed={isAuthed}
            notifOpen={notifOpen}
            notifLoading={notifLoading}
            unreadCount={unreadCount}
            notifications={notifications}
            viewerRole={viewerRole}
            browserNotifEnabled={browserNotifEnabled}
            browserNotifPermission={browserNotifPermission}
            onOpenNotifications={onOpenNotifications}
            onMarkAllRead={onMarkAllRead}
            onNotificationClick={onNotificationClick}
            onToggleBrowserNotifications={onToggleBrowserNotifications}
            notifRef={notifRef}
          />

          <NavbarAccountMenu
            isAuthed={isAuthed}
            accountOpen={accountOpen}
            name={name}
            initials={initials}
            onToggle={onToggleAccountMenu}
            onAccount={onAccount}
            onLogout={onLogout}
            accountRef={accountRef}
          />

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
                  "absolute left-0 top-[4px] h-[2px] w-5 transition-transform duration-200 ease-out",
                  menuOpen ? "translate-y-[6px] rotate-45" : "",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
              <span
                className={[
                  "absolute left-0 top-[10px] h-[2px] w-5 transition-opacity duration-200 ease-out",
                  menuOpen ? "opacity-0" : "opacity-100",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
              <span
                className={[
                  "absolute left-0 top-[16px] h-[2px] w-5 transition-transform duration-200 ease-out",
                  menuOpen ? "translate-y-[-6px] -rotate-45" : "",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
            </div>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div ref={menuRef} className="menu-slide-down">
          <NavbarMobileMenu
            menuOpen={menuOpen}
            name={name}
            initials={initials}
            isAuthed={isAuthed}
            navItems={NAV_ITEMS}
            browserNotifEnabled={browserNotifEnabled}
            browserNotifPermission={browserNotifPermission}
            onNavClick={onNavClick}
            onCloseMenu={onCloseMenu}
            onAccount={onAccount}
            onLogout={onLogout}
            onToggleBrowserNotifications={onToggleBrowserNotifications}
          />
        </div>
      ) : null}
    </header>
  );
}