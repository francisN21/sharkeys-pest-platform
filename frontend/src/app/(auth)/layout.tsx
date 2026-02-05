"use client";

import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen grid place-items-center px-4"
      style={{ background: "rgb(var(--bg))" }}
    >
      <div className="w-full max-w-md space-y-6 fade-up">
        {/* Logo (standalone, no background) */}
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

        {/* Auth Card */}
        <div
          className="rounded-3xl border p-6 shadow-sm"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
