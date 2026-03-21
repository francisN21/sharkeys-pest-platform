"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  ClipboardList,
  CreditCard,
  ServerCog,
  Wrench,
  User,
} from "lucide-react";
import type { AppNotification } from "../../lib/api/notifications";

type NotificationViewerRole = "customer" | "technician" | "worker" | "admin" | "superuser";
type NormalizedViewerRole = "customer" | "technician" | "admin";

function normalizeViewerRole(
  role: NotificationViewerRole | null | undefined
): NormalizedViewerRole {
  if (role === "admin" || role === "superuser") return "admin";
  if (role === "technician" || role === "worker") return "technician";
  return "customer";
}

function inferViewerRoleFromPathname(
  pathname: string | null | undefined
): NormalizedViewerRole | null {
  if (!pathname) return null;

  if (pathname.startsWith("/account/admin/")) return "admin";
  if (pathname.startsWith("/account/techbookings")) return "admin";
  if (pathname.startsWith("/account/technician")) return "technician";
  if (pathname.startsWith("/account/bookings")) return "customer";

  return null;
}

function resolveViewerRole(
  pathname: string | null | undefined,
  role: NotificationViewerRole | null | undefined
): NormalizedViewerRole {
  const inferred = inferViewerRoleFromPathname(pathname);
  if (inferred) return inferred;
  return normalizeViewerRole(role);
}

function formatNotificationTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Just now";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getKindLabel(kind: string) {
  switch (kind) {
    case "message.new":
      return "Message";
    case "booking.created":
      return "Booking";
    case "booking.accepted":
      return "Accepted";
    case "booking.assigned":
      return "Assigned";
    case "booking.reassigned":
      return "Reassigned";
    case "booking.cancelled":
      return "Cancelled";
    case "booking.completed":
      return "Completed";
    case "booking.price_set":
      return "Price";
    case "booking.edited":
      return "Updated";
    case "system.error":
      return "System";
    default:
      return kind;
  }
}

function getKindIcon(kind: string) {
  switch (kind) {
    case "message.new":
      return <MessageSquare className="h-4 w-4" />;
    case "booking.created":
    case "booking.accepted":
    case "booking.assigned":
    case "booking.reassigned":
    case "booking.cancelled":
    case "booking.completed":
    case "booking.edited":
      return <ClipboardList className="h-4 w-4" />;
    case "booking.price_set":
      return <CreditCard className="h-4 w-4" />;
    case "technician":
      return <Wrench className="h-4 w-4" />;
    case "customer":
    case "lead":
      return <User className="h-4 w-4" />;
    case "system.error":
      return <ServerCog className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getKindAccent(kind: string) {
  switch (kind) {
    case "message.new":
      return {
        bg: "rgba(6, 182, 212, 0.10)",
        border: "rgba(6, 182, 212, 0.26)",
        color: "rgb(6 182 212)",
      };
    case "booking.completed":
      return {
        bg: "rgba(16, 185, 129, 0.10)",
        border: "rgba(16, 185, 129, 0.28)",
        color: "rgb(16 185 129)",
      };
    case "booking.cancelled":
      return {
        bg: "rgba(239, 68, 68, 0.08)",
        border: "rgba(239, 68, 68, 0.28)",
        color: "rgb(239 68 68)",
      };
    case "booking.assigned":
    case "booking.reassigned":
      return {
        bg: "rgba(168, 85, 247, 0.09)",
        border: "rgba(168, 85, 247, 0.26)",
        color: "rgb(168 85 247)",
      };
    case "booking.price_set":
      return {
        bg: "rgba(34, 197, 94, 0.09)",
        border: "rgba(34, 197, 94, 0.26)",
        color: "rgb(34 197 94)",
      };
    default:
      return {
        bg: "rgba(59, 130, 246, 0.08)",
        border: "rgba(59, 130, 246, 0.22)",
        color: "rgb(59 130 246)",
      };
  }
}

function getBrowserAlertStatusText(
  browserNotifEnabled: boolean,
  browserNotifPermission: NotificationPermission | "unsupported"
) {
  if (browserNotifPermission === "unsupported") return "Not supported in this browser";
  if (browserNotifPermission === "denied") return "Blocked in browser settings";
  if (browserNotifEnabled) return "Enabled";
  return "Off";
}

function getBrowserAlertButtonLabel(
  browserNotifEnabled: boolean,
  browserNotifPermission: NotificationPermission | "unsupported"
) {
  if (browserNotifPermission === "unsupported") return "Unavailable";
  if (browserNotifPermission === "denied") return "Blocked";
  if (browserNotifEnabled) return "On";
  return "Turn on";
}

function getNotificationBookingId(item: AppNotification): string | null {
  return item.booking_public_id ?? null;
}

function getAdminNotificationHref(item: AppNotification, bookingId: string | null): string {
  switch (item.kind) {
    case "booking.created":
    case "booking.accepted":
    case "booking.cancelled":
    case "booking.edited":
      return "/account/admin/dispatch";

    case "booking.assigned":
    case "booking.reassigned":
    case "booking.price_set":
    case "message.new":
      return bookingId
        ? `/account/techbookings/bookings/${bookingId}`
        : "/account/techbookings";

    case "booking.completed":
      return bookingId
        ? `/account/techbookings/bookings/${bookingId}`
        : "/account/admin/jobhistory";

    default:
      return bookingId
        ? `/account/techbookings/bookings/${bookingId}`
        : "/account";

    
  }

}

function getTechnicianNotificationHref(item: AppNotification, bookingId: string | null): string {
  switch (item.kind) {
    case "booking.assigned":
    case "booking.reassigned":
    case "booking.cancelled":
    case "booking.price_set":
    case "booking.completed":
    case "message.new":
    case "booking.edited":
    case "booking.accepted":
    case "booking.created":
      return bookingId
        ? `/account/technician/bookings/${bookingId}`
        : "/account/technician";

    default:
      return bookingId
        ? `/account/technician/bookings/${bookingId}`
        : "/account/technician";
  }
}

function getCustomerNotificationHref(item: AppNotification, bookingId: string | null): string {
  switch (item.kind) {
    case "message.new":
    case "booking.accepted":
    case "booking.assigned":
    case "booking.reassigned":
    case "booking.cancelled":
    case "booking.completed":
    case "booking.price_set":
    case "booking.edited":
    case "booking.created":
      return bookingId ? `/account/bookings/${bookingId}` : "/account/bookings";

    default:
      return bookingId ? `/account/bookings/${bookingId}` : "/account";
  }
}

function getNotificationHref(
  item: AppNotification,
  viewerRole: NormalizedViewerRole
): string {
  const bookingId = getNotificationBookingId(item);

  if (viewerRole === "admin") {
    return getAdminNotificationHref(item, bookingId);
  }

  if (viewerRole === "technician") {
    return getTechnicianNotificationHref(item, bookingId);
  }

  return getCustomerNotificationHref(item, bookingId);
}

type NotificationDropdownProps = {
  open: boolean;
  loading?: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  viewerRole?: NotificationViewerRole | null;
  onMarkAllRead: () => void | Promise<void>;
  onNotificationClick: (item: AppNotification) => void | Promise<void>;
  browserNotifEnabled: boolean;
  browserNotifPermission: NotificationPermission | "unsupported";
  onToggleBrowserNotifications: () => void | Promise<void>;
};

function NotificationCard({
  item,
  onClick,
}: {
  item: AppNotification;
  onClick: (item: AppNotification) => void | Promise<void>;
}) {
  const unread = !item.read_at;
  const accent = getKindAccent(item.kind);
  const label = getKindLabel(item.kind);

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="w-full rounded-2xl border p-3 text-left transition hover:scale-[0.995] hover:opacity-95"
      style={{
        borderColor: unread ? accent.border : "rgb(var(--border))",
        background: unread ? accent.bg : "rgb(var(--bg))",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: unread ? accent.border : "rgb(var(--border))",
            background: unread ? accent.bg : "rgb(var(--card))",
            color: accent.color,
          }}
        >
          {getKindIcon(item.kind)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[rgb(var(--fg))]">
                {item.title}
              </div>
              <div
                className="mt-1 line-clamp-3 text-xs leading-5 sm:line-clamp-2"
                style={{ color: "rgb(var(--muted))" }}
              >
                {item.body || "Open to view details."}
              </div>
            </div>

            {unread ? (
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: "rgb(239 68 68)" }}
              />
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold"
                style={{
                  background: accent.bg,
                  color: accent.color,
                }}
              >
                {label}
              </span>

              {typeof item.metadata?.serviceTitle === "string" &&
                item.metadata.serviceTitle && (
                  <span
                    className="truncate rounded-full px-2 py-1 text-[10px] font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    {item.metadata.serviceTitle}
                  </span>
                )}
            </div>

            <span
              className="shrink-0 text-[11px]"
              style={{ color: "rgb(var(--muted))" }}
            >
              {formatNotificationTime(item.created_at)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function NotificationDropdown({
  open,
  loading = false,
  notifications,
  unreadCount,
  viewerRole = null,
  onMarkAllRead,
  onNotificationClick,
  browserNotifEnabled,
  browserNotifPermission,
  onToggleBrowserNotifications,
}: NotificationDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (!open) return null;

  const browserAlertsDisabled =
    browserNotifPermission === "unsupported" || browserNotifPermission === "denied";

  const resolvedViewerRole = resolveViewerRole(pathname, viewerRole);

  async function handleNotificationClick(item: AppNotification) {
    const href = getNotificationHref(item, resolvedViewerRole);

    try {
      await onNotificationClick(item);
    } finally {
      router.push(href);
    }
  }

  return (
    <div
      className="
        fixed inset-x-2 top-[76px] z-[70] overflow-hidden rounded-3xl border shadow-2xl
        sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]
      "
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--card))",
        boxShadow: "0 18px 45px rgba(0,0,0,0.28)",
        maxHeight: "calc(100svh - 92px)",
      }}
      role="menu"
      data-viewer-role={resolvedViewerRole}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-4"
        style={{ borderBottom: "1px solid rgb(var(--border))" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(59,130,246,0.10)", color: "rgb(59 130 246)" }}
          >
            <Bell className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold hover:opacity-90"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--bg))",
            color: "rgb(var(--fg))",
          }}
          onClick={onMarkAllRead}
        >
          <CheckCheck className="h-4 w-4" />
          <span className="hidden xs:inline">Mark all read</span>
          <span className="xs:hidden">Mark read</span>
        </button>
      </div>

      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid rgb(var(--border))" }}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: "rgb(var(--fg))" }}>
            Browser alerts
          </div>
          <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
            {getBrowserAlertStatusText(browserNotifEnabled, browserNotifPermission)}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleBrowserNotifications}
          disabled={browserAlertsDisabled}
          className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
          style={{
            borderColor: browserNotifEnabled ? "rgb(34 197 94)" : "rgb(var(--border))",
            background: browserNotifEnabled ? "rgba(34, 197, 94, 0.10)" : "rgb(var(--bg))",
            color: browserNotifEnabled ? "rgb(22 101 52)" : "rgb(var(--fg))",
          }}
        >
          {getBrowserAlertButtonLabel(browserNotifEnabled, browserNotifPermission)}
        </button>
      </div>

      <div
        className="overflow-y-auto p-3"
        style={{ maxHeight: "calc(100svh - 220px)" }}
      >
        {loading ? (
          <div className="px-2 py-6 text-sm" style={{ color: "rgb(var(--muted))" }}>
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "rgba(59,130,246,0.08)", color: "rgb(59 130 246)" }}
            >
              <Bell className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold">No notifications yet</div>
            <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
              New activity will appear here.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <NotificationCard
                key={`${item.id}-${item.created_at}`}
                item={item}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}