"use client";

import React from "react";
import { notifyBrowser } from "../lib/notify";
import { toastSuccess, toastError, toastInfo, toastWarning } from "../lib/toast";

type Level = "success" | "error" | "info" | "warning";

export function appNotify(args: {
  level?: Level;
  toastTitle: string;
  toastDescription?: string;

  entity?: "booking" | "customer" | "lead" | "technician" | "payment" | "system" | "message";
  entityId?: string | number;
  at?: Date | string;
  amountCents?: number;
  actorName?: string;
  details?: { label: string; value: React.ReactNode; icon?: React.ReactNode }[];

  actionLabel?: string;
  onAction?: () => void;
  copyText?: string;

  // Browser notification behavior
  browser?: boolean; // default: true
  browserOnlyWhenHidden?: boolean; // default: true (most companies do this)
  browserTitle?: string;
  browserBody?: string;
}) {
  const level = args.level ?? "info";

  const toastOpts = {
    description: args.toastDescription,
    entity: args.entity,
    entityId: args.entityId,
    at: args.at,
    amountCents: args.amountCents,
    actorName: args.actorName,
    details: args.details,
    actionLabel: args.actionLabel,
    onAction: args.onAction,
    copyText: args.copyText,
  };

  if (level === "success") toastSuccess(args.toastTitle, toastOpts);
  else if (level === "error") toastError(args.toastTitle, toastOpts);
  else if (level === "warning") toastWarning(args.toastTitle, toastOpts);
  else toastInfo(args.toastTitle, toastOpts);

  const wantsBrowser = args.browser ?? true;
  if (!wantsBrowser) return;

  const onlyWhenHidden = args.browserOnlyWhenHidden ?? true;
  const isHidden =
    typeof document !== "undefined" ? document.visibilityState !== "visible" : false;

  if (onlyWhenHidden && !isHidden) return;

  notifyBrowser(args.browserTitle ?? args.toastTitle, args.browserBody ?? args.toastDescription);
}