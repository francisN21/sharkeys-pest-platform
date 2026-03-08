"use client";

import React from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  Hash,
  DollarSign,
  User,
  Wrench,
  MessageSquare,
  CreditCard,
  ServerCog,
  ClipboardList,
} from "lucide-react";

type ToastLevel = "success" | "error" | "warning" | "info" | "default";

type ToastDetail = {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
};

export type AppToastOptions = {
  level?: ToastLevel;
  title: string;
  description?: string;

  details?: ToastDetail[];

  entity?: "booking" | "customer" | "lead" | "technician" | "payment" | "system" | "message";
  entityId?: string | number;
  at?: Date | string;
  amountCents?: number;
  actorName?: string;

  actionLabel?: string;
  onAction?: () => void;
  copyText?: string;

  durationMs?: number;
  important?: boolean;
};

function formatMoneyFromCents(cents?: number) {
  if (typeof cents !== "number" || Number.isNaN(cents)) return undefined;
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function formatWhen(at?: Date | string) {
  if (!at) return undefined;
  const d = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) return typeof at === "string" ? at : undefined;

  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function levelIcon(level: ToastLevel) {
  switch (level) {
    case "success":
      return <CheckCircle2 className="h-4.5 w-4.5" />;
    case "error":
      return <XCircle className="h-4.5 w-4.5" />;
    case "warning":
      return <AlertTriangle className="h-4.5 w-4.5" />;
    case "info":
      return <Info className="h-4.5 w-4.5" />;
    default:
      return <Info className="h-4.5 w-4.5" />;
  }
}

function levelAccent(level: ToastLevel) {
  switch (level) {
    case "success":
      return {
        border: "rgb(16 185 129)",
        bg: "rgba(16,185,129,0.10)",
        text: "rgb(16 185 129)",
      };
    case "error":
      return {
        border: "rgb(239 68 68)",
        bg: "rgba(239,68,68,0.10)",
        text: "rgb(239 68 68)",
      };
    case "warning":
      return {
        border: "rgb(245 158 11)",
        bg: "rgba(245,158,11,0.12)",
        text: "rgb(245 158 11)",
      };
    case "info":
      return {
        border: "rgb(14 165 233)",
        bg: "rgba(14,165,233,0.10)",
        text: "rgb(14 165 233)",
      };
    default:
      return {
        border: "rgb(var(--border))",
        bg: "rgba(255,255,255,0.04)",
        text: "rgb(var(--fg))",
      };
  }
}

function entityConfig(entity?: AppToastOptions["entity"]) {
  switch (entity) {
    case "booking":
      return {
        label: "Booking",
        icon: <ClipboardList className="h-3.5 w-3.5" />,
        bg: "rgba(59,130,246,0.12)",
        color: "rgb(59 130 246)",
      };
    case "customer":
      return {
        label: "Customer",
        icon: <User className="h-3.5 w-3.5" />,
        bg: "rgba(16,185,129,0.12)",
        color: "rgb(16 185 129)",
      };
    case "lead":
      return {
        label: "Lead",
        icon: <User className="h-3.5 w-3.5" />,
        bg: "rgba(245,158,11,0.12)",
        color: "rgb(245 158 11)",
      };
    case "technician":
      return {
        label: "Technician",
        icon: <Wrench className="h-3.5 w-3.5" />,
        bg: "rgba(168,85,247,0.12)",
        color: "rgb(168 85 247)",
      };
    case "payment":
      return {
        label: "Payment",
        icon: <CreditCard className="h-3.5 w-3.5" />,
        bg: "rgba(34,197,94,0.12)",
        color: "rgb(34 197 94)",
      };
    case "message":
      return {
        label: "Message",
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        bg: "rgba(6,182,212,0.12)",
        color: "rgb(6 182 212)",
      };
    case "system":
      return {
        label: "System",
        icon: <ServerCog className="h-3.5 w-3.5" />,
        bg: "rgba(107,114,128,0.14)",
        color: "rgb(107 114 128)",
      };
    default:
      return null;
  }
}

function MetaChip({
  icon,
  text,
}: {
  icon?: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--bg))",
        color: "rgb(var(--muted))",
      }}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="truncate">{text}</span>
    </div>
  );
}

function DetailRow({ d }: { d: ToastDetail }) {
  return (
    <div className="flex items-start gap-2 text-[12px] leading-4">
      <div className="mt-[1px] shrink-0" style={{ color: "rgb(var(--muted))" }}>
        {d.icon ?? null}
      </div>
      <div className="min-w-[68px] shrink-0" style={{ color: "rgb(var(--muted))" }}>
        {d.label}
      </div>
      <div className="min-w-0 break-words text-[rgb(var(--fg))]">{d.value}</div>
    </div>
  );
}

function AppToastContent(opts: AppToastOptions) {
  const lvl = opts.level ?? "default";
  const accent = levelAccent(lvl);
  const when = formatWhen(opts.at);
  const money = formatMoneyFromCents(opts.amountCents);
  const entity = entityConfig(opts.entity);

  const normalizedDetails: ToastDetail[] = [
    ...(opts.entityId != null
      ? [{ label: "ID", value: String(opts.entityId), icon: <Hash className="h-3.5 w-3.5" /> }]
      : []),
    ...(money
      ? [{ label: "Amount", value: money, icon: <DollarSign className="h-3.5 w-3.5" /> }]
      : []),
    ...(opts.actorName
      ? [{ label: "By", value: opts.actorName, icon: <User className="h-3.5 w-3.5" /> }]
      : []),
    ...(when
      ? [{ label: "When", value: when, icon: <Clock className="h-3.5 w-3.5" /> }]
      : []),
    ...(opts.details ?? []),
  ];

  return (
    <div
      className="w-[360px] rounded-xl border shadow-xl"
      style={{
        background: "rgb(var(--card))",
        borderColor: "rgb(var(--border))",
        boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
      }}
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
          style={{
            borderColor: accent.border,
            background: accent.bg,
            color: accent.text,
          }}
        >
          {levelIcon(lvl)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold leading-5 text-[rgb(var(--fg))]">
                {opts.title}
              </div>

              {opts.description ? (
                <div className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[rgb(var(--muted))]">
                  {opts.description}
                </div>
              ) : null}
            </div>

            {entity ? (
              <div
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold"
                style={{
                  background: entity.bg,
                  color: entity.color,
                }}
              >
                {entity.icon}
                <span>{entity.label}</span>
              </div>
            ) : null}
          </div>

          {(opts.entityId != null || when || money || opts.actorName) ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {opts.entityId != null ? (
                <MetaChip icon={<Hash className="h-3.5 w-3.5" />} text={String(opts.entityId)} />
              ) : null}
              {money ? (
                <MetaChip icon={<DollarSign className="h-3.5 w-3.5" />} text={money} />
              ) : null}
              {opts.actorName ? (
                <MetaChip icon={<User className="h-3.5 w-3.5" />} text={opts.actorName} />
              ) : null}
              {when ? (
                <MetaChip icon={<Clock className="h-3.5 w-3.5" />} text={when} />
              ) : null}
            </div>
          ) : null}

          {normalizedDetails.length > 0 ? (
            <div
              className="mt-2 rounded-lg border p-2"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--bg))",
              }}
            >
              <div className="grid gap-1.5">
                {normalizedDetails.map((d, idx) => (
                  <DetailRow key={idx} d={d} />
                ))}
              </div>
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
  return appToast({
    ...options,
    title,
    level: "error",
    important: options?.important ?? true,
  });
}

export function toastInfo(title: string, options?: Omit<AppToastOptions, "title" | "level">) {
  return appToast({ ...options, title, level: "info" });
}

export function toastWarning(title: string, options?: Omit<AppToastOptions, "title" | "level">) {
  return appToast({ ...options, title, level: "warning" });
}