"use client";
import React from "react";
import { appNotify } from "../../lib/appNotify";
import {
  Wrench,
  Tag,
  User,
  Clock,
  DollarSign,
} from "lucide-react";
import type { RealtimeEvent } from "./events";

function fmtMoney(cents?: number | null) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDatetime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * WS event -> decide toast content + decide browser notification behavior
 */
export function notifyFromEvent(evt: RealtimeEvent) {
  switch (evt.type) {
    case "booking.created": {
      const desc = [evt.bookingName, evt.customerName].filter(Boolean).join(" • ") || "A new booking was submitted.";
      const atStr = fmtDatetime(evt.startsAt);
      appNotify({
        level: "info",
        toastTitle: "New booking created",
        toastDescription: desc,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.startsAt,
        details: [
          {
            label: "Customer",
            value: evt.customerName ?? "—",
            icon: <User className="h-4 w-4" />,
          },
          ...(atStr ? [{ label: "Starts", value: atStr, icon: <Clock className="h-4 w-4" /> }] : []),
        ],
        browserTitle: "New booking",
        browserBody: desc,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;
    }

    case "booking.accepted": {
      const atStr = fmtDatetime(evt.startsAt);
      const desc = evt.serviceTitle
        ? `Your ${evt.serviceTitle}${atStr ? ` at ${atStr}` : ""} has been accepted.`
        : "Your booking has been accepted.";
      appNotify({
        level: "success",
        toastTitle: "Booking accepted",
        toastDescription: desc,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.acceptedAt,
        browserTitle: "Booking accepted",
        browserBody: desc,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;
    }

    case "booking.assigned": {
      const atStr = fmtDatetime(evt.startsAt);
      const role = evt.recipientRole;

      let toastTitle: string;
      let desc: string;

      if (role === "worker") {
        toastTitle = "New job assigned";
        desc = evt.serviceTitle
          ? `${evt.customerName ? `Booking from ${evt.customerName}: ` : ""}${evt.serviceTitle}${atStr ? ` at ${atStr}` : ""}.`
          : "A new booking has been assigned to you.";
      } else if (role === "customer") {
        toastTitle = "Technician assigned";
        desc = evt.serviceTitle
          ? `Your ${evt.serviceTitle} is now assigned to ${evt.technicianName ?? "a technician"}.`
          : `Your booking is now assigned to ${evt.technicianName ?? "a technician"}.`;
      } else {
        // admin / default
        toastTitle = "Booking assigned";
        desc = evt.serviceTitle
          ? `${evt.serviceTitle}${evt.customerName ? ` from ${evt.customerName}` : ""}${evt.technicianName ? ` → ${evt.technicianName}` : ""}.`
          : `Booking assigned${evt.technicianName ? ` to ${evt.technicianName}` : ""}.`;
      }

      appNotify({
        level: "success",
        toastTitle,
        toastDescription: desc,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.assignedAt,
        browserTitle: toastTitle,
        browserBody: desc,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;
    }

    case "booking.reassigned": {
      const desc = evt.serviceTitle
        ? `${evt.serviceTitle} has been reassigned to another technician.`
        : "A booking has been reassigned to another technician.";
      appNotify({
        level: "warning",
        toastTitle: "Booking reassigned",
        toastDescription: desc,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.assignedAt,
        browserTitle: "Booking reassigned",
        browserBody: desc,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;
    }

    case "booking.cancelled": {
      const desc = evt.serviceTitle
        ? `Your ${evt.serviceTitle} booking is now cancelled.`
        : "Your booking has been cancelled.";
      appNotify({
        level: "warning",
        toastTitle: "Booking cancelled",
        toastDescription: desc,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.cancelledAt,
        browserTitle: "Booking cancelled",
        browserBody: desc,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;
    }

    case "booking.edited": {
      const startsStr = fmtDatetime(evt.startsAt);
      const endsStr = fmtDatetime(evt.endsAt);
      const desc = startsStr ? `Rescheduled to ${startsStr}.` : "A booking has been updated.";
      appNotify({
        level: "info",
        toastTitle: "Booking updated",
        toastDescription: desc,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.startsAt,
        details: [
          ...(startsStr ? [{ label: "Starts", value: startsStr, icon: <Clock className="h-4 w-4" /> }] : []),
          ...(endsStr ? [{ label: "Ends", value: endsStr, icon: <Clock className="h-4 w-4" /> }] : []),
        ],
        browserTitle: "Booking updated",
        browserBody: desc,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;
    }

    case "booking.completed": {
      const priceStr = fmtMoney(evt.finalPriceCents);
      const service = evt.bookingName ?? null;
      const desc = [
        service,
        evt.technicianName ? `by ${evt.technicianName}` : null,
        priceStr,
      ].filter(Boolean).join(" • ") || "A booking has been completed.";
      appNotify({
        level: "success",
        toastTitle: "Booking completed",
        toastDescription: desc,
        entity: "booking",
        entityId: evt.bookingId,
        at: evt.completedAt,
        amountCents: evt.finalPriceCents,
        actorName: evt.technicianName,
        details: [
          ...(evt.technicianName ? [{ label: "Technician", value: evt.technicianName, icon: <Wrench className="h-4 w-4" /> }] : []),
          ...(service ? [{ label: "Service", value: service, icon: <Tag className="h-4 w-4" /> }] : []),
        ],
        browserTitle: "Job completed",
        browserBody: desc,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;
    }

    case "booking.price_set": {
      const priceStr = fmtMoney(evt.finalPriceCents);
      const desc = priceStr ? `Final price set: ${priceStr}.` : "Final price has been updated.";
      appNotify({
        level: "info",
        toastTitle: "Final price updated",
        toastDescription: desc,
        entity: "payment",
        entityId: evt.bookingId,
        at: evt.setAt,
        amountCents: evt.finalPriceCents,
        details: [
          { label: "Amount", value: priceStr ?? "—", icon: <DollarSign className="h-4 w-4" /> },
        ],
        browserTitle: "Final price updated",
        browserBody: desc,
        browser: true,
        browserOnlyWhenHidden: true,
      });
      return;
    }

    case "message.new":
      appNotify({
        level: "info",
        toastTitle: evt.fromName ? `New message from ${evt.fromName}` : "New message",
        toastDescription: evt.snippet ?? "You received a message.",
        entity: "message",
        entityId: evt.threadId,
        at: evt.at,
        details: evt.serviceTitle
          ? [{ label: "Service", value: evt.serviceTitle, icon: <Wrench className="h-4 w-4" /> }]
          : [],
        browserTitle: evt.fromName ? `Message from ${evt.fromName}` : "New message",
        browserBody: [evt.snippet, evt.serviceTitle].filter(Boolean).join(" • ") || "Open the app to reply.",
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