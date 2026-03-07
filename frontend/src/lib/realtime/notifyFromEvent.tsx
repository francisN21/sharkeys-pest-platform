"use client";

import React from "react";
import { appNotify } from "../../lib/appNotify";
import { Wrench, Tag, User, Clock } from "lucide-react";
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
          { label: "Customer", value: evt.customerName ?? "—", icon: <User className="h-4 w-4" /> },
          { label: "Starts", value: evt.startsAt ?? "—", icon: <Clock className="h-4 w-4" /> },
        ],
        browserTitle: "New booking",
        browserBody: evt.bookingName ?? `Booking ${evt.bookingId}`,
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
          { label: "Technician", value: evt.technicianName ?? "—", icon: <Wrench className="h-4 w-4" /> },
        ],
        browserTitle: "New job assigned",
        browserBody: `${evt.bookingName ?? evt.bookingId} → ${evt.technicianName ?? "Technician"}`,
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
          { label: "Technician", value: evt.technicianName ?? "—", icon: <Wrench className="h-4 w-4" /> },
          { label: "Booking", value: evt.bookingId, icon: <Tag className="h-4 w-4" /> },
        ],
        browserTitle: "Job completed",
        browserBody:
          `${evt.bookingName ?? evt.bookingId}` +
          (typeof evt.finalPriceCents === "number" ? ` • $${(evt.finalPriceCents / 100).toFixed(2)}` : ""),
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
        details: [{ label: "From", value: evt.fromName ?? "—", icon: <User className="h-4 w-4" /> }],
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
        browserOnlyWhenHidden: false, // errors can be shown even when visible if you want
      });
      return;
  }
}