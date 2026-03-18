"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Image from "next/image";

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
      className="min-h-screen grid place-items-center px-4"
      style={{ background: "rgb(var(--bg))", color: "rgb(var(--fg))" }}
    >
      <div className="w-full max-w-md space-y-6 fade-up">
        <div className="flex flex-col items-center gap-3">
          <Link href="/" aria-label="Go to homepage">
            <Image
              src="/main-logo.jpg"
              alt="Sharkys Pest Control"
              width={256}
              height={256}
              className="object-contain rounded-2xl"
              priority
            />
          </Link>

          <div className="text-center">
            <div className="text-lg font-semibold tracking-tight">
              Sharkys Pest Control
            </div>
          </div>
        </div>

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
            <div
              className="mt-6 text-center text-sm"
              style={{ color: "rgb(var(--muted))" }}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}