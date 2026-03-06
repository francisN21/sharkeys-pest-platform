"use client";

import React from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  Tag,
  DollarSign,
  User,
  Wrench,
} from "lucide-react";

type ToastLevel = "success" | "error" | "warning" | "info" | "default";

type ToastDetail = { label: string; value: React.ReactNode; icon?: React.ReactNode };

export type AppToastOptions = {
  level?: ToastLevel;
  title: string;
  description?: string;

  // important details
  details?: ToastDetail[];

  entity?: "booking" | "customer" | "lead" | "technician" | "payment" | "system" | "message";
  entityId?: string | number;
  at?: Date | string;
  amountCents?: number;
  actorName?: string;

  // actions
  actionLabel?: string;
  onAction?: () => void;
  copyText?: string;

  durationMs?: number;
  important?: boolean;
};

function formatMoneyFromCents(cents?: number) {
  if (typeof cents !== "number" || Number.isNaN(cents)) return undefined;
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatWhen(at?: Date | string) {
  if (!at) return undefined;
  const d = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) return typeof at === "string" ? at : undefined;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function levelIcon(level: ToastLevel) {
  switch (level) {
    case "success":
      return <CheckCircle2 className="h-5 w-5" />;
    case "error":
      return <XCircle className="h-5 w-5" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5" />;
    case "info":
      return <Info className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
}

function levelAccent(level: ToastLevel) {
  switch (level) {
    case "success":
      return "border-l-4 border-l-emerald-500";
    case "error":
      return "border-l-4 border-l-red-500";
    case "warning":
      return "border-l-4 border-l-amber-500";
    case "info":
      return "border-l-4 border-l-sky-500";
    default:
      return "border-l-4 border-l-muted-foreground/40";
  }
}

function entityLabel(entity?: AppToastOptions["entity"]) {
  if (!entity) return undefined;
  switch (entity) {
    case "booking":
      return "Booking";
    case "customer":
      return "Customer";
    case "lead":
      return "Lead";
    case "technician":
      return "Technician";
    case "payment":
      return "Payment";
    case "system":
      return "System";
    case "message":
      return "Message";
    default:
      return undefined;
  }
}

function entityIcon(entity?: AppToastOptions["entity"]) {
  switch (entity) {
    case "booking":
      return <Tag className="h-4 w-4" />;
    case "customer":
    case "lead":
      return <User className="h-4 w-4" />;
    case "technician":
      return <Wrench className="h-4 w-4" />;
    case "payment":
      return <DollarSign className="h-4 w-4" />;
    default:
      return <Tag className="h-4 w-4" />;
  }
}

function DetailRow({ d }: { d: ToastDetail }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <div className="mt-[2px] text-muted-foreground">{d.icon ?? null}</div>
      <div className="min-w-[88px] text-muted-foreground">{d.label}</div>
      <div className="break-all">{d.value}</div>
    </div>
  );
}

function AppToastContent(opts: AppToastOptions) {
  const lvl = opts.level ?? "default";
  const when = formatWhen(opts.at);
  const money = formatMoneyFromCents(opts.amountCents);
  const ent = entityLabel(opts.entity);

  const normalizedDetails: ToastDetail[] = [
    ...(ent ? [{ label: "Type", value: ent, icon: entityIcon(opts.entity) }] : []),
    ...(opts.entityId != null ? [{ label: "ID", value: String(opts.entityId), icon: <Tag className="h-4 w-4" /> }] : []),
    ...(money ? [{ label: "Amount", value: money, icon: <DollarSign className="h-4 w-4" /> }] : []),
    ...(opts.actorName ? [{ label: "By", value: opts.actorName, icon: <User className="h-4 w-4" /> }] : []),
    ...(when ? [{ label: "When", value: when, icon: <Clock className="h-4 w-4" /> }] : []),
    ...(opts.details ?? []),
  ];

  return (
    <div className={`w-full ${levelAccent(lvl)} pl-2`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{levelIcon(lvl)}</div>

        <div className="flex-1">
          <div className="text-sm font-semibold leading-5">{opts.title}</div>

          {opts.description ? (
            <div className="mt-0.5 text-sm text-muted-foreground">{opts.description}</div>
          ) : null}

          {normalizedDetails.length ? (
            <div className="mt-2 grid gap-1 rounded-md border bg-muted/30 p-2">
              {normalizedDetails.map((d, idx) => (
                <DetailRow key={idx} d={d} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function appToast(opts: AppToastOptions) {
  const duration =
    typeof opts.durationMs === "number" ? opts.durationMs : opts.important ? 7000 : 4500;

  return toast.custom(() => <AppToastContent {...opts} />, {
    duration,
    action:
      opts.actionLabel && opts.onAction
        ? { label: opts.actionLabel, onClick: opts.onAction }
        : undefined,
    cancel:
      opts.copyText
        ? {
            label: "Copy",
            onClick: async () => {
              try {
                await navigator.clipboard.writeText(opts.copyText ?? "");
                toast.success("Copied to clipboard");
              } catch {
                toast.error("Copy failed");
              }
            },
          }
        : undefined,
  });
}

export function toastSuccess(title: string, options?: Omit<AppToastOptions, "title" | "level">) {
  return appToast({ ...options, title, level: "success" });
}
export function toastError(title: string, options?: Omit<AppToastOptions, "title" | "level">) {
  return appToast({ ...options, title, level: "error", important: options?.important ?? true });
}
export function toastInfo(title: string, options?: Omit<AppToastOptions, "title" | "level">) {
  return appToast({ ...options, title, level: "info" });
}
export function toastWarning(title: string, options?: Omit<AppToastOptions, "title" | "level">) {
  return appToast({ ...options, title, level: "warning" });
}