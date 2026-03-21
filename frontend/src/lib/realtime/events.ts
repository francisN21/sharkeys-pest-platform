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
      serviceTitle?: string;
      startsAt?: string;
    }
  | {
      type: "booking.assigned";
      bookingId: string;
      assignedAt?: string;
      serviceTitle?: string;
      technicianName?: string;
      startsAt?: string;
      customerName?: string;
      recipientRole?: string;
    }
  | {
      type: "booking.reassigned";
      bookingId: string;
      assignedAt?: string;
      serviceTitle?: string;
    }
  | {
      type: "booking.cancelled";
      bookingId: string;
      cancelledAt?: string;
      serviceTitle?: string;
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