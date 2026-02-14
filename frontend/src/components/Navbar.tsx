"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "./AuthProvider";
import { me as apiMe } from "../lib/api/auth";

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Booking", href: "#booking" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

type NavbarUser = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "U";
}

function displayName(user: { first_name?: string | null; last_name?: string | null; email: string }) {
  const first = (user.first_name || "").trim();
  const last = (user.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || user.email;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const { user, loading, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  /**
   * ✅ Local "resolved user" fallback:
   * If AuthProvider doesn't update after login (cookie is set but context is stale),
   * Navbar will call /auth/me and update itself without a hard reload.
   */
  const [resolvedUser, setResolvedUser] = useState<NavbarUser | null>(null);

  const effectiveUser = (user as NavbarUser | null) ?? resolvedUser;
  const isAuthed = !!effectiveUser;

  const name = useMemo(() => (effectiveUser ? displayName(effectiveUser) : ""), [effectiveUser]);
  const initials = useMemo(() => (name ? getInitials(name) : "U"), [name]);

  // Close dropdowns when navigating
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // ✅ Only show section nav items on landing page "/"
  const showLandingNav = pathname === "/";

  // ✅ Re-check /auth/me when:
  // - auth context says "not authed"
  // - or page changes (e.g., login -> /account)
  // - or window regains focus
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

    // If AuthProvider has a user, trust it and sync local
    if (!loading && user) {
      setResolvedUser(user as NavbarUser);
      return;
    }

    // If AuthProvider says not loading and no user, try resolving from cookie session
    if (!loading && !user) {
      refreshMe();
    }

    function onFocus() {
      // When user comes back to tab, re-check session cookie
      if (!loading && !user) refreshMe();
    }

    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [loading, user, pathname]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;

      // ✅ Don’t treat hamburger button clicks as “outside click”
      if (hamburgerRef.current && hamburgerRef.current.contains(t)) return;

      if (menuOpen && menuRef.current && !menuRef.current.contains(t)) {
        setMenuOpen(false);
      }
      if (accountOpen && accountRef.current && !accountRef.current.contains(t)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen, accountOpen]);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function onNavClick(href: string) {
    setMenuOpen(false);

    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function onLogout() {
    setAccountOpen(false);
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      // ✅ keep navbar consistent immediately
      setResolvedUser(null);
      router.push("/login");
    }
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgba(var(--bg), 0.85)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
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

        {/* Desktop nav (ONLY on "/") */}
        {showLandingNav ? (
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
        ) : (
          <div className="hidden md:block" />
        )}

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Desktop theme toggle */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Desktop auth/actions */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Book a Service ALWAYS */}
            <Link
              href="/book"
              className="rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90"
              style={{
                background: "rgb(var(--primary))",
                color: "rgb(var(--primary-fg))",
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

            {!loading && isAuthed ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold"
                    style={{ background: "rgba(var(--fg), 0.12)" }}
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <span className="max-w-[160px] truncate">{name}</span>
                  <span className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    ▾
                  </span>
                </button>

                {accountOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border shadow-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    role="menu"
                  >
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
                      style={{ color: "rgb(var(--fg))" }}
                      onClick={onLogout}
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Hamburger (mobile) */}
          <button
            ref={hamburgerRef}
            type="button"
            className="md:hidden rounded-xl border p-2 hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
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

      {/* Mobile dropdown */}
      {menuOpen ? (
        <div
          className="md:hidden border-t"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.95)" }}
        >
          <div ref={menuRef} className="mx-auto max-w-6xl px-4 py-4 space-y-4">
            {/* Theme toggle inside mobile panel */}
            <div
              className="flex items-center justify-between rounded-xl border p-3"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              <div className="text-sm font-semibold">Theme</div>
              <ThemeToggle />
            </div>

            {/* Landing page section links ONLY on "/" */}
            {showLandingNav ? (
              <div className="grid gap-2">
                {NAV.map((n) => (
                  <a
                    key={n.href}
                    href={n.href}
                    className="rounded-xl px-3 py-3 text-sm font-semibold hover:opacity-90"
                    style={{ background: "rgb(var(--card))", color: "rgb(var(--fg))" }}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavClick(n.href);
                    }}
                  >
                    {n.label}
                  </a>
                ))}
              </div>
            ) : null}

            {/* Book a Service ALWAYS */}
            <Link
              href="/book"
              className="block rounded-xl px-3 py-3 text-center text-sm font-semibold hover:opacity-90"
              style={{
                background: "rgb(var(--primary))",
                color: "rgb(var(--primary-fg))",
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
                  style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>

                <Link
                  href="/signup"
                  className="rounded-xl border px-3 py-3 text-center text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
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
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                >
                  <div className="text-sm font-semibold truncate">{name}</div>
                  <div className="text-xs mt-1" style={{ color: "rgb(var(--muted))" }}>
                    Signed in
                  </div>
                </div>

                <button
                  className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/account");
                  }}
                >
                  Account
                </button>

                <button
                  className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  onClick={onLogout}
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