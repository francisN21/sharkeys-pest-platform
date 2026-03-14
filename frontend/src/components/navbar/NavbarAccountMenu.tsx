"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import type { NavbarAccountMenuProps } from "./navbar.types";

type Props = NavbarAccountMenuProps & {
  accountRef: React.RefObject<HTMLDivElement | null>;
};

export default function NavbarAccountMenu({
  isAuthed,
  accountOpen,
  name,
  initials,
  onToggle,
  onAccount,
  onLogout,
  accountRef,
}: Props) {
  if (!isAuthed) return null;

  return (
    <div className="relative hidden md:block" ref={accountRef}>
      <button
        type="button"
        onClick={onToggle}
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
            onClick={onAccount}
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
  );
}