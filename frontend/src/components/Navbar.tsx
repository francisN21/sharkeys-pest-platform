"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "./AuthProvider";
// const { user, loading, logout } = useAuth;

// const isAuthed = !!user;

// const displayName = useMemo(() => {
//   if (!user) return "Account";
//   const name = user.full_name?.trim();
//   if (name) return name;
//   // fallback to email prefix if no name stored
//   const emailPrefix = user.email?.split("@")[0]?.trim();
//   return emailPrefix || "Account";
// }, [user]);

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Booking", href: "#booking" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const AVATARS = ["/avatars/a1.svg", "/avatars/a2.svg", "/avatars/a3.svg", "/avatars/a4.svg", "/avatars/a5.svg"];

function pickAvatar(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
}



export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);

  const acctPanelRef = useRef<HTMLDivElement | null>(null);
  const acctToggleRef = useRef<HTMLButtonElement | null>(null);

  const isAuthed = !!user;

  const avatarSrc = useMemo(() => {
    if (!user) return AVATARS[0];
    return pickAvatar(user.email || user.id);
  }, [user]);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // Smooth scroll to anchor
  function scrollToAnchor(href: string) {
    if (!href.startsWith("#")) return;
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Outside click handling for both menus
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) return;

      // Mobile menu
      if (mobileOpen) {
        const panel = mobilePanelRef.current;
        const toggle = mobileToggleRef.current;
        const clickInsidePanel = panel?.contains(t);
        const clickOnToggle = toggle?.contains(t);
        if (!clickInsidePanel && !clickOnToggle) setMobileOpen(false);
      }

      // Account dropdown
      if (accountOpen) {
        const panel = acctPanelRef.current;
        const toggle = acctToggleRef.current;
        const clickInsidePanel = panel?.contains(t);
        const clickOnToggle = toggle?.contains(t);
        if (!clickInsidePanel && !clickOnToggle) setAccountOpen(false);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [mobileOpen, accountOpen]);

  // ESC to close menus
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      setAccountOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock body scroll only for mobile menu
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setAccountOpen(false);
      setMobileOpen(false);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.85)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <Image src="/main-logo.jpg" alt="Sharkys Pest Control" width={52} height={52} className="rounded-xl" priority />
          <div className="leading-tight">
            <div className="text-base font-semibold">Sharkys Pest Control</div>
            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Bay Area
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm hover:opacity-90"
              style={{ color: "rgb(var(--muted))" }}
              onClick={(e) => {
                e.preventDefault();
                scrollToAnchor(n.href);
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            {/* KEEP Book a Service always */}
            <Link
              href="/book"
              className="rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90"
              style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
            >
              Book a Service
            </Link>

            {loading ? null : isAuthed ? (
              <div className="relative">
                <button
                  ref={acctToggleRef}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", color: "rgb(var(--fg))" }}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((v) => !v)}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border">
                    <Image src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  </span>
                  <span className="hidden lg:inline">Account</span>
                </button>

                {accountOpen && (
                  <div
                    ref={acctPanelRef}
                    className="absolute right-0 mt-2 w-48 rounded-2xl border p-2 shadow-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    role="menu"
                  >
                    <Link
                      href="/account"
                      className="block rounded-xl px-3 py-2 text-sm font-semibold hover:opacity-90"
                      style={{ color: "rgb(var(--fg))" }}
                      onClick={() => setAccountOpen(false)}
                      role="menuitem"
                    >
                      Account
                    </Link>

                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold hover:opacity-90"
                      style={{ color: "rgb(var(--fg))" }}
                      onClick={handleLogout}
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90"
                style={{ color: "rgb(var(--muted))" }}
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            ref={mobileToggleRef}
            type="button"
            className="md:hidden rounded-xl border p-2 hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <div className="relative h-5 w-5">
              <span
                className={[
                  "absolute left-0 top-[4px] h-[2px] w-5 transition-transform",
                  mobileOpen ? "translate-y-[6px] rotate-45" : "",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
              <span
                className={[
                  "absolute left-0 top-[10px] h-[2px] w-5 transition-opacity",
                  mobileOpen ? "opacity-0" : "opacity-100",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
              <span
                className={[
                  "absolute left-0 top-[16px] h-[2px] w-5 transition-transform",
                  mobileOpen ? "translate-y-[-6px] -rotate-45" : "",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.95)" }}
        >
          <div ref={mobilePanelRef} className="mx-auto max-w-6xl px-4 py-4">
            <div className="grid gap-2">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="rounded-xl px-3 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ background: "rgb(var(--card))", color: "rgb(var(--fg))" }}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileOpen(false);
                    scrollToAnchor(n.href);
                  }}
                >
                  {n.label}
                </a>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              {/* Keep Book a Service always */}
              <Link
                href="/book"
                className="rounded-xl px-3 py-3 text-sm font-semibold hover:opacity-90"
                style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
                onClick={() => setMobileOpen(false)}
              >
                Book a Service
              </Link>

              {loading ? null : isAuthed ? (
                <>
                  <Link
                    href="/account"
                    className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                    style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Account
                  </Link>

                  <button
                    type="button"
                    className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                    style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
