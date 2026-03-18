"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Image from "next/image";

const LOGO_SRC = "/main-logo.jpg";

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