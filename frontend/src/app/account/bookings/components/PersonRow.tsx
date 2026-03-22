"use client";

import React, { type ReactNode } from "react";
import { normalizeText } from "../helpers";
import type { PersonLite } from "../types";

export default function PersonRow({
  title,
  person,
  showEvenIfEmpty,
  footer,
}: {
  title: string;
  person: PersonLite | null;
  showEvenIfEmpty?: boolean;
  footer?: ReactNode;
}) {
  if (!person && !showEvenIfEmpty && !footer) return null;

  const name = normalizeText(person?.name);
  const phone = normalizeText(person?.phone);
  const email = normalizeText(person?.email);
  const role = normalizeText(person?.role);

  const hasAny = !!(name || phone || email || role);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-sm">
      <div className="text-xs font-semibold text-[rgb(var(--muted))]">{title}</div>

      {hasAny ? (
        <div className="mt-1">
          <div className="font-semibold text-[rgb(var(--fg))]">{name ?? "—"}</div>
          <div className="break-words text-xs text-[rgb(var(--muted))]">
            {role ? `${role} • ` : ""}
            {phone ?? "—"}
            {email ? ` • ${email}` : ""}
          </div>
        </div>
      ) : (
        <div className="mt-1 text-[rgb(var(--muted))]">—</div>
      )}

      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}
