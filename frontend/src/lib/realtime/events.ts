"use client";

export type RealtimeEvent =
  | {
      type: "booking.created";
      bookingId: string;
      bookingName?: string;
      customerName?: string;
      startsAt?: string;
    }
  | {
      type: "booking.accepted";
      bookingId: string;
      acceptedAt?: string;
    }
  | {
      type: "booking.assigned";
      bookingId: string;
      bookingName?: string;
      technicianName?: string;
      assignedAt?: string;
    }
  | {
      type: "booking.reassigned";
      bookingId: string;
      bookingName?: string;
      assignedAt?: string;
    }
  | {
      type: "booking.cancelled";
      bookingId: string;
      cancelledAt?: string;
    }
  | {
      type: "booking.edited";
      bookingId: string;
      startsAt?: string;
      endsAt?: string;
    }
  | {
      type: "booking.completed";
      bookingId: string;
      bookingName?: string;
      technicianName?: string;
      completedAt?: string;
      finalPriceCents?: number;
    }
  | {
      type: "booking.price_set";
      bookingId: string;
      finalPriceCents?: number;
      setAt?: string;
    }
  | {
      type: "message.new";
      threadId: string;
      fromName?: string;
      snippet?: string;
      serviceTitle?: string;
      at?: string;
    }
  | {
      type: "system.error";
      message: string;
      requestId?: string;
      at?: string;
    };