"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../components/ThemeToggle";

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Services", href: "#services" },
  { label: "Booking", href: "#booking" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      const panel = panelRef.current;
      if (!panel) return;
      if (panel.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Optional: lock body scroll when menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function onNavClick(href: string) {
    setOpen(false);

    // Smooth scroll to anchor
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <div className="mx-auto flex max-w-6xl items-center justify-between px4 py-3">
        {/* Brand */}
        <Link href="" className="flex items-center gap-3">
          <Image
            src="/spc-icon.png"
            alt="Sharkys Pest Control"
            width={52}
            height={52}
            className="rounded-xl"
            style={{
                marginLeft: "5px",
            }}
            priority
          />
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
                // If you're using snap scroll container, prevent default + smooth scroll
                e.preventDefault();
                onNavClick(n.href);
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Desktop buttons */}
          <div className="hidden items-center gap-3 md:flex">
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
              style={{
                background: "rgb(var(--primary))",
                color: "rgb(var(--primary-fg))",
              }}
            >
              Book a Service
            </Link>
          </div>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            className="md:hidden rounded-xl border p-2 hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", marginRight: "5px" }}
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {/* Simple hamburger / X icon */}
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
                    onNavClick(n.href);
                  }}
                >
                  {n.label}
                </a>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
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
                style={{
                  background: "rgb(var(--primary))",
                  color: "rgb(var(--primary-fg))",
                }}
                onClick={() => setOpen(false)}
              >
                Book a Service
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
