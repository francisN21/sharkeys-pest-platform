"use client";
import React from "react";
import { appNotify } from "../../lib/appNotify";
import {
  Wrench,
  Tag,
  User,
  Clock,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import type { RealtimeEvent } from "./events";

function bookingDisplayName(evt: RealtimeEvent) {
  const serviceName =
    "bookingName" in evt && typeof evt.bookingName === "string" && evt.bookingName.trim()
      ? evt.bookingName.trim()
      : null;

  const customerName =
    "customerName" in evt && typeof evt.customerName === "string" && evt.customerName.trim()
      ? evt.customerName.trim()
      : null;

  if (serviceName && customerName) return `${serviceName} • ${customerName}`;
  if (serviceName) return serviceName;
  if ("bookingId" in evt && typeof evt.bookingId === "string" && evt.bookingId.trim()) {
    return `Booking ${evt.bookingId}`;
  }
  return "Booking";
}

function fmtMoney(cents?: number | null) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * WS event -> decide toast content + decide browser notification behavior
 */
export function notifyFromEvent(evt: RealtimeEvent) {
  switch (evt.type) {
    case "booking.created":
      appNotify({
        level: "info",
        toastTitle: "New booking created",
        toastDescription: bookingDisplayName(evt),
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.startsAt,
        details: [
          {
            label: "Customer",
            value: evt.customerName ?? "—",
            icon: <User className="h-4 w-4" />,
          },
          {
            label: "Starts",
            value: evt.startsAt ?? "—",
            icon: <Clock className="h-4 w-4" />,
          },
        ],
        browserTitle: "New booking",
        browserBody: bookingDisplayName(evt),
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.accepted":
      appNotify({
        level: "success",
        toastTitle: "Booking accepted",
        toastDescription: bookingDisplayName(evt),
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.acceptedAt,
        details: [
          {
            label: "Booking",
            value: bookingDisplayName(evt),
            icon: <Tag className="h-4 w-4" />,
          },
        ],
        browserTitle: "Booking accepted",
        browserBody: bookingDisplayName(evt),
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.assigned":
      appNotify({
        level: "success",
        toastTitle: "Booking assigned",
        toastDescription: bookingDisplayName(evt),
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.assignedAt,
        actorName: evt.technicianName,
        details: [
          {
            label: "Technician",
            value: evt.technicianName ?? "—",
            icon: <Wrench className="h-4 w-4" />,
          },
        ],
        browserTitle: "New job assigned",
        browserBody: `${bookingDisplayName(evt)} → ${evt.technicianName ?? "Technician"}`,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.reassigned":
      appNotify({
        level: "warning",
        toastTitle: "Booking reassigned",
        toastDescription: bookingDisplayName(evt),
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.assignedAt,
        details: [
          {
            label: "Booking",
            value: bookingDisplayName(evt),
            icon: <Tag className="h-4 w-4" />,
          },
          {
            label: "Status",
            value: "Technician updated",
            icon: <Wrench className="h-4 w-4" />,
          },
        ],
        browserTitle: "Booking reassigned",
        browserBody: `${bookingDisplayName(evt)} has a new technician.`,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.cancelled":
      appNotify({
        level: "warning",
        toastTitle: "Booking cancelled",
        toastDescription: bookingDisplayName(evt),
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.cancelledAt,
        details: [
          {
            label: "Booking",
            value: bookingDisplayName(evt),
            icon: <Tag className="h-4 w-4" />,
          },
        ],
        browserTitle: "Booking cancelled",
        browserBody: bookingDisplayName(evt),
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.edited":
      appNotify({
        level: "info",
        toastTitle: "Booking updated",
        toastDescription: bookingDisplayName(evt),
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.startsAt,
        details: [
          {
            label: "Starts",
            value: evt.startsAt ?? "—",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            label: "Ends",
            value: evt.endsAt ?? "—",
            icon: <Clock className="h-4 w-4" />,
          },
        ],
        browserTitle: "Booking updated",
        browserBody: bookingDisplayName(evt),
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.completed":
      appNotify({
        level: "success",
        toastTitle: "Booking completed",
        toastDescription: bookingDisplayName(evt),
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.completedAt,
        amountCents: evt.finalPriceCents,
        actorName: evt.technicianName,
        details: [
          {
            label: "Technician",
            value: evt.technicianName ?? "—",
            icon: <Wrench className="h-4 w-4" />,
          },
          {
            label: "Booking",
            value: bookingDisplayName(evt),
            icon: <Tag className="h-4 w-4" />,
          },
        ],
        browserTitle: "Job completed",
        browserBody:
          `${bookingDisplayName(evt)}` +
          (fmtMoney(evt.finalPriceCents) ? ` • ${fmtMoney(evt.finalPriceCents)}` : ""),
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.price_set":
      appNotify({
        level: "info",
        toastTitle: "Final price updated",
        toastDescription: bookingDisplayName(evt),
        entity: "payment",
        entityId: evt.bookingId,
        at: evt.setAt,
        amountCents: evt.finalPriceCents,
        details: [
          {
            label: "Type",
            value: "Final Price",
            icon: <DollarSign className="h-4 w-4" />,
          },
          {
            label: "Booking",
            value: bookingDisplayName(evt),
            icon: <Tag className="h-4 w-4" />,
          },
        ],
        browserTitle: "Final price updated",
        browserBody:
          `${bookingDisplayName(evt)}` +
          (fmtMoney(evt.finalPriceCents) ? ` • ${fmtMoney(evt.finalPriceCents)}` : ""),
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "message.new":
      appNotify({
        level: "info",
        toastTitle: "New message",
        toastDescription: evt.snippet ?? "You received a message.",
        entity: "message",
        entityId: evt.threadId,
        at: evt.at,
        details: [
          {
            label: "From",
            value: evt.fromName ?? "—",
            icon: <User className="h-4 w-4" />,
          },
          {
            label: "Thread",
            value: evt.threadId,
            icon: <MessageSquare className="h-4 w-4" />,
          },
        ],
        browserTitle: `Message from ${evt.fromName ?? "someone"}`,
        browserBody: evt.snippet ?? "Open the app to reply.",
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "system.error":
      appNotify({
        level: "error",
        toastTitle: "System error",
        toastDescription: evt.message,
        entity: "system",
        entityId: evt.requestId,
        at: evt.at,
        browserTitle: "System error",
        browserBody: evt.message,
        browser: true,
        browserOnlyWhenHidden: false,
      });
      return;

    default:
      return;
  }
}