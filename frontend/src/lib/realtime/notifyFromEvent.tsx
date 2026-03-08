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

/**
 * WS event -> decide toast content + decide browser notification behavior
 */
export function notifyFromEvent(evt: RealtimeEvent) {
  switch (evt.type) {
    case "booking.created":
      appNotify({
        level: "info",
        toastTitle: "New booking created",
        toastDescription: evt.bookingName ?? `Booking ${evt.bookingId}`,
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
        browserBody: evt.bookingName ?? `Booking ${evt.bookingId}`,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.accepted":
      appNotify({
        level: "success",
        toastTitle: "Booking accepted",
        toastDescription: `Booking ${evt.bookingId} has been accepted.`,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.acceptedAt,
        details: [
          {
            label: "Booking",
            value: evt.bookingId,
            icon: <Tag className="h-4 w-4" />,
          },
        ],
        browserTitle: "Booking accepted",
        browserBody: `Booking ${evt.bookingId} has been accepted.`,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.assigned":
      appNotify({
        level: "success",
        toastTitle: "Booking assigned",
        toastDescription: evt.bookingName ?? `Booking ${evt.bookingId}`,
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
        browserBody: `${evt.bookingName ?? evt.bookingId} → ${evt.technicianName ?? "Technician"}`,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.reassigned":
      appNotify({
        level: "warning",
        toastTitle: "Booking reassigned",
        toastDescription: evt.bookingName ?? `Booking ${evt.bookingId}`,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.assignedAt,
        details: [
          {
            label: "Booking",
            value: evt.bookingId,
            icon: <Tag className="h-4 w-4" />,
          },
          {
            label: "Status",
            value: "Technician updated",
            icon: <Wrench className="h-4 w-4" />,
          },
        ],
        browserTitle: "Booking reassigned",
        browserBody: `${evt.bookingName ?? evt.bookingId} has a new technician.`,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.cancelled":
      appNotify({
        level: "warning",
        toastTitle: "Booking cancelled",
        toastDescription: `Booking ${evt.bookingId} has been cancelled.`,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.cancelledAt,
        details: [
          {
            label: "Booking",
            value: evt.bookingId,
            icon: <Tag className="h-4 w-4" />,
          },
        ],
        browserTitle: "Booking cancelled",
        browserBody: `Booking ${evt.bookingId} has been cancelled.`,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.edited":
      appNotify({
        level: "info",
        toastTitle: "Booking updated",
        toastDescription: `Booking ${evt.bookingId} was updated.`,
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
        browserBody: `Booking ${evt.bookingId} was updated.`,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.completed":
      appNotify({
        level: "success",
        toastTitle: "Booking completed",
        toastDescription: evt.bookingName ?? `Booking ${evt.bookingId}`,
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
            value: evt.bookingId,
            icon: <Tag className="h-4 w-4" />,
          },
        ],
        browserTitle: "Job completed",
        browserBody:
          `${evt.bookingName ?? evt.bookingId}` +
          (typeof evt.finalPriceCents === "number"
            ? ` • $${(evt.finalPriceCents / 100).toFixed(2)}`
            : ""),
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;

    case "booking.price_set":
      appNotify({
        level: "info",
        toastTitle: "Final price updated",
        toastDescription: `Booking ${evt.bookingId} now has a final price.`,
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
            value: evt.bookingId,
            icon: <Tag className="h-4 w-4" />,
          },
        ],
        browserTitle: "Final price updated",
        browserBody:
          `Booking ${evt.bookingId}` +
          (typeof evt.finalPriceCents === "number"
            ? ` • $${(evt.finalPriceCents / 100).toFixed(2)}`
            : ""),
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