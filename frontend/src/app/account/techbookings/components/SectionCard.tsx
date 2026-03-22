"use client";

import React from "react";

export default function SectionCard({
  title,
  subtitle,
  actions,
  children,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="border-b border-white/[0.07] bg-white/[0.03] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {icon ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
                  {icon}
                </div>
              ) : null}

              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[rgb(var(--fg))] sm:text-base">
                  {title}
                </h3>
                {subtitle ? (
                  <p className="mt-0.5 text-xs sm:text-sm" style={{ color: "rgb(var(--muted))" }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}