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

  if (user.user_role === "superuser") return "superuser";
  if (user.user_role === "admin") return "admin";
  if (user.user_role === "worker") return "worker";
  if (user.user_role === "customer") return "customer";

  const roles = user.roles ?? [];
  if (roles.includes("superuser")) return "superuser";
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
        body: [evt.bookingName, evt.customerName].filter(Boolean).join(" • ") || "A new booking was submitted.",
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
        body: evt.serviceTitle
          ? `Your ${evt.serviceTitle} booking has been accepted.`
          : "Your booking has been accepted.",
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.acceptedAt ?? now,
      };

    case "booking.assigned": {
      const role = evt.recipientRole;
      let body: string;
      if (role === "worker") {
        body = evt.serviceTitle
          ? `${evt.customerName ? `Booking from ${evt.customerName}: ` : ""}${evt.serviceTitle}.`
          : "A new booking has been assigned to you.";
      } else if (role === "customer") {
        body = evt.serviceTitle
          ? `Your ${evt.serviceTitle} is now assigned to ${evt.technicianName ?? "a technician"}.`
          : `Your booking is now assigned to ${evt.technicianName ?? "a technician"}.`;
      } else {
        body = evt.serviceTitle
          ? `${evt.serviceTitle}${evt.customerName ? ` from ${evt.customerName}` : ""}${evt.technicianName ? ` → ${evt.technicianName}` : ""}.`
          : `Booking assigned${evt.technicianName ? ` to ${evt.technicianName}` : ""}.`;
      }
      return {
        id: Date.now(),
        kind: evt.type,
        title: role === "worker" ? "New job assigned" : role === "customer" ? "Technician assigned" : "Booking assigned",
        body,
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.assignedAt ?? now,
      };
    }

    case "booking.reassigned":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking reassigned",
        body: evt.serviceTitle
          ? `${evt.serviceTitle} has been reassigned to another technician.`
          : "A booking has been reassigned to another technician.",
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
        body: evt.serviceTitle
          ? `Your ${evt.serviceTitle} booking is now cancelled.`
          : "Your booking has been cancelled.",
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
        body: evt.startsAt
          ? `Rescheduled to ${new Date(evt.startsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
          : "A booking has been updated.",
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.startsAt ?? now,
      };

    case "booking.completed": {
      const price = typeof evt.finalPriceCents === "number"
        ? ` • $${(evt.finalPriceCents / 100).toFixed(2)}`
        : "";
      const service = evt.bookingName ?? null;
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Booking completed",
        body: [
          service,
          evt.technicianName ? `by ${evt.technicianName}` : null,
          price ? price.replace(" • ", "") : null,
        ].filter(Boolean).join(" • ") || "A booking has been completed.",
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.completedAt ?? now,
      };
    }

    case "booking.price_set": {
      const priceStr = typeof evt.finalPriceCents === "number"
        ? `$${(evt.finalPriceCents / 100).toFixed(2)}`
        : null;
      return {
        id: Date.now(),
        kind: evt.type,
        title: "Final price updated",
        body: priceStr ? `Final price set: ${priceStr}.` : "Final price has been updated.",
        booking_public_id: evt.bookingId,
        message_id: null,
        metadata: {},
        read_at: null,
        created_at: evt.setAt ?? now,
      };
    }

    case "message.new":
      return {
        id: Date.now(),
        kind: evt.type,
        title: evt.fromName ? `New message from ${evt.fromName}` : "New message",
        body: evt.snippet ?? "You received a new message.",
        booking_public_id: evt.threadId,
        message_id: null,
        metadata: { serviceTitle: evt.serviceTitle ?? null },
        read_at: null,
        created_at: evt.at ?? now,
      };

    case "system.error":
      return {
        id: Date.now(),
        kind: evt.type,
        title: "System error",
        body: evt.message,
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