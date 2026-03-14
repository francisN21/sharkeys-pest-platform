"use client";

import Link from "next/link";
import React from "react";

type BlogCardProps = {
  title: string;
  desc: string;
  href: string;
  date?: string;
  imageUrl?: string | null;
};

export default function BlogCard({
  title,
  desc,
  href,
  date = "Coming soon",
  imageUrl = null,
}: BlogCardProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <Link
      href={href}
      className="
        group relative block overflow-hidden rounded-3xl border
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-2xl
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      "
      style={{
        borderColor: "rgb(var(--border))",
        background: hasImage
          ? `linear-gradient(180deg, rgba(12,18,46,0.08) 0%, rgba(12,18,46,0.72) 100%), url(${imageUrl}) center / cover no-repeat`
          : "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(79,70,229,0.12) 45%, rgba(15,23,42,0.96) 100%)",
      }}
    >
      <div
        className="
          pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300
          group-hover:opacity-100
        "
        style={{
          background:
            "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.10) 35%, transparent 70%)",
          transform: "translateX(-100%)",
          animation: "none",
        }}
      />

      <div
        className="
          pointer-events-none absolute inset-0 transition-transform duration-500 ease-out
          group-hover:scale-[1.03]
        "
        style={{
          background: hasImage
            ? "linear-gradient(180deg, rgba(20,28,70,0.18) 0%, rgba(12,18,46,0.78) 100%)"
            : "radial-gradient(circle at top right, rgba(255,255,255,0.10), transparent 35%)",
        }}
      />

      <div className="relative flex min-h-[280px] flex-col justify-end p-6 sm:min-h-[320px]">
        <div className="mb-3">
          <span
            className="
              inline-flex items-center rounded-full border px-3 py-1 text-[11px]
              font-extrabold uppercase tracking-[0.08em]
              transition-transform duration-300 group-hover:translate-x-0.5
            "
            style={{
              borderColor: "rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.10)",
              color: "rgb(255 255 255)",
              backdropFilter: "blur(8px)",
            }}
          >
            {date}
          </span>
        </div>

        <h2
          className="
            max-w-[22ch] text-2xl font-extrabold leading-tight tracking-tight
            text-white transition-transform duration-300 group-hover:translate-y-[-2px]
            sm:text-3xl
          "
        >
          {title}
        </h2>

        <p className="mt-4 max-w-[52ch] text-sm leading-7 text-white/85 sm:text-base">
          {desc}
        </p>

        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-white">
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
            Read article
          </span>
          <span
            className="transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}