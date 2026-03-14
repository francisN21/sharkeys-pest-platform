import type { AppNotification } from "../../lib/api/notifications";
import type { RealtimeEvent } from "../../lib/realtime/events";
import type { NavbarUser, NotificationViewerRole } from "./navbar.types";

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "U";
}

export function displayName(user: {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}) {
  const first = (user.first_name || "").trim();
  const last = (user.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || user.email;
}

export function normalizeViewerRole(
  user: NavbarUser | null
): NotificationViewerRole | null {
  if (!user) return null;

  if (user.user_role === "admin") return "admin";
  if (user.user_role === "worker") return "worker";
  if (user.user_role === "customer") return "customer";

  const roles = user.roles ?? [];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("worker")) return "worker";
  if (roles.includes("customer")) return "customer";

  return null;
}

export function mapRealtimeEventToPreview(evt: RealtimeEvent): AppNotification | null {
  const now = new Date().toISOString();

  switch (evt.type) {
    case "booking.created":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "New booking created",
        body: evt.bookingName ?? `Booking ${evt.bookingId}`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.startsAt ?? now,
      };

    case "booking.accepted":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking accepted",
        body: `Booking ${evt.bookingId} has been accepted.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.acceptedAt ?? now,
      };

    case "booking.assigned":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking assigned",
        body: `Booking ${evt.bookingId} has been assigned.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.assignedAt ?? now,
      };

    case "booking.reassigned":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking reassigned",
        body: `Booking ${evt.bookingId} has a new technician.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.assignedAt ?? now,
      };

    case "booking.cancelled":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking cancelled",
        body: `Booking ${evt.bookingId} has been cancelled.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.cancelledAt ?? now,
      };

    case "booking.edited":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking updated",
        body: `Booking ${evt.bookingId} was updated.`,
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.startsAt ?? now,
      };

    case "booking.completed":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking completed",
        body:
          `Booking ${evt.bookingId}` +
          (evt.technicianName ? ` by ${evt.technicianName}` : "") +
          (typeof evt.finalPriceCents === "number"
            ? ` • $${(evt.finalPriceCents / 100).toFixed(2)}`
            : ""),
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.completedAt ?? now,
      };

    case "booking.price_set":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Final price updated",
        body:
          `Booking ${evt.bookingId}` +
          (typeof evt.finalPriceCents === "number"
            ? ` • $${(evt.finalPriceCents / 100).toFixed(2)}`
            : ""),
        booking_id: null,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.setAt ?? now,
      };

    case "message.new":
      return {
        id: Date.now(),
        kind: evt.type,
        title: evt.fromName ? `New message from ${evt.fromName}` : "New message",
        body: evt.snippet ?? "You received a new message.",
        booking_id: null,
        booking_public_id: evt.threadId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.at ?? now,
      };

    case "system.error":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "System error",
        body: evt.message,
        booking_id: null,
        booking_public_id: null,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.at ?? now,
      };

    default:
      return null;
  }
}