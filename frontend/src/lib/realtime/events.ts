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
      type: "booking.assigned";
      bookingId: string;
      bookingName?: string;
      technicianName?: string;
      assignedAt?: string;
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
      type: "message.new";
      threadId: string;
      fromName?: string;
      snippet?: string;
      at?: string;
    }
  | {
      type: "system.error";
      message: string;
      requestId?: string;
      at?: string;
    };