"use client";

import Link from "next/link";
import { Bug } from "lucide-react";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <div
      className="min-h-screen w-full px-4 py-10 sm:px-6"
      style={{ background: "rgb(var(--bg))", color: "rgb(var(--fg))" }}
    >
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div
          className="w-full rounded-3xl border p-6 shadow-2xl sm:p-8"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <div className="mb-6 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: "rgb(var(--primary))",
                  color: "rgb(var(--primary-fg))",
                }}
              >
                <Bug className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold leading-tight">Sharky&apos;s Pest Control</p>
                <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Customer portal
                </p>
              </div>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              {subtitle}
            </p>
          </div>

          {children}

          {footer ? (
            <div className="mt-6 text-center text-sm" style={{ color: "rgb(var(--muted))" }}>
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}