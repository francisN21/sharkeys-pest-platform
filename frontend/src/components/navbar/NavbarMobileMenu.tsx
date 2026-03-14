"use client";

import React from "react";
import Link from "next/link";
import type { NavbarMobileMenuProps } from "./navbar.types";

export default function NavbarMobileMenu({
  menuOpen,
  name,
  initials,
  isAuthed,
  navItems,
  browserNotifEnabled,
  browserNotifPermission,
  onNavClick,
  onCloseMenu,
  onAccount,
  onLogout,
  onToggleBrowserNotifications,
}: NavbarMobileMenuProps) {
  if (!menuOpen) return null;

  return (
    <div
      className="border-t md:hidden"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgba(var(--bg), 0.96)",
      }}
    >
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        <div className="grid gap-2">
          {navItems.map((n) => (
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
          onClick={onCloseMenu}
        >
          Book a Service
        </Link>

        {!isAuthed ? (
          <div className="grid gap-2">
            <Link
              href="/login"
              className="rounded-xl border px-3 py-3 text-center text-sm font-semibold hover:opacity-90"
              style={{
                borderColor: "rgb(var(--border))",
                color: "rgb(var(--fg))",
              }}
              onClick={onCloseMenu}
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
              onClick={onCloseMenu}
            >
              Sign up
            </Link>
          </div>
        ) : null}

        {isAuthed ? (
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
              onClick={onAccount}
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
  );
}