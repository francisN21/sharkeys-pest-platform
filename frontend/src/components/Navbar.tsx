"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "./AuthProvider";

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
  const { user, loading, logout: doLogout } = useAuth();

  const [open, setOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  // Close menu when route changes (e.g., login/signup/account)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click (but ignore clicks on the toggle button)
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const panel = panelRef.current;
      const toggle = toggleRef.current;
      const target = e.target as Node | null;

      if (!target) return;
      if (panel && panel.contains(target)) return;
      if (toggle && toggle.contains(target)) return;

      setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Lock body scroll on mobile menu open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const avatarSrc = useMemo(() => {
    if (!user) return AVATARS[0];
    return pickAvatar(user.email || user.id);
  }, [user]);

  function scrollToAnchor(href: string) {
    if (!href.startsWith("#")) return;
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleLogout() {
    try {
      await doLogout();
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  const isAuthed = !!user;

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgba(var(--bg), 0.85)",
      }}
    >
      {/* Use px-4 for consistent mobile padding (fix edge-closeness) */}
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
            {loading ? null : isAuthed ? (
              <>
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90"
                  style={{ color: "rgb(var(--fg))" }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border">
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  </span>
                  Account
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl px-3 py-2 text-sm font-semibold hover:opacity-90"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Sign in
                </Link>

                <Link
                  href="/signup"
                  className="rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90"
                  style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
                >
                  Book a Service
                </Link>
              </>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            ref={toggleRef}
            type="button"
            className="md:hidden rounded-xl border p-2 hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <div className="relative h-5 w-5">
              <span
                className={[
                  "absolute left-0 top-[4px] h-[2px] w-5 transition-transform",
                  open ? "translate-y-[6px] rotate-45" : "",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
              <span
                className={[
                  "absolute left-0 top-[10px] h-[2px] w-5 transition-opacity",
                  open ? "opacity-0" : "opacity-100",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
              <span
                className={[
                  "absolute left-0 top-[16px] h-[2px] w-5 transition-transform",
                  open ? "translate-y-[-6px] -rotate-45" : "",
                ].join(" ")}
                style={{ background: "rgb(var(--fg))" }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          id="mobile-menu"
          className="md:hidden border-t"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.95)" }}
        >
          <div ref={panelRef} className="mx-auto max-w-6xl px-4 py-4">
            <div className="grid gap-2">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="rounded-xl px-3 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ background: "rgb(var(--card))", color: "rgb(var(--fg))" }}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    scrollToAnchor(n.href);
                  }}
                >
                  {n.label}
                </a>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              {loading ? null : isAuthed ? (
                <>
                  <Link
                    href="/account"
                    className="flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                    style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
                    onClick={() => setOpen(false)}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border">
                      <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                    </span>
                    Account
                  </Link>

                  <button
                    type="button"
                    onClick={async () => {
                      setOpen(false);
                      await handleLogout();
                    }}
                    className="rounded-xl px-3 py-3 text-sm font-semibold hover:opacity-90"
                    style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl border px-3 py-3 text-sm font-semibold hover:opacity-90"
                    style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>

                  <Link
                    href="/signup"
                    className="rounded-xl px-3 py-3 text-sm font-semibold hover:opacity-90"
                    style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
                    onClick={() => setOpen(false)}
                  >
                    Book a Service
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
