type BookingStatus = "pending" | "accepted" | "assigned" | "completed" | "cancelled";

export type BookingCard = {
  public_id: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  address: string;
  notes: string | null;
  created_at?: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
  service_title: string;


  assigned_worker_public_id?: string | null;
  assigned_worker_first_name?: string | null;
  assigned_worker_last_name?: string | null;
  assigned_worker_phone?: string | null;
  assigned_worker_email?: string | null;
  assigned_at?: string | null;


  completed_by_public_id?: string | null;
  completed_by_first_name?: string | null;
  completed_by_last_name?: string | null;
  completed_by_phone?: string | null;
  completed_by_email?: string | null;
  completed_event_at?: string | null;
};

export type MyBookingsResponse = {
  ok: boolean;
  upcoming: BookingCard[];
  history: BookingCard[];
};

export type CreateBookingResponse = {
  ok: boolean;
  booking?: {
    id?: string;
    public_id: string;
    status: string;
    starts_at: string;
    ends_at: string;
    address: string;
    created_at: string;
  };
};




import { jsonFetch } from "./http";

export function getMyBookings() {
  return jsonFetch<MyBookingsResponse>("/bookings/me", { method: "GET" });
}
export type CreateBookingInput = {
  servicePublicId: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  address: string;
  notes?: string;
};



export async function createBooking(payload: {
  servicePublicId: string;
  startsAt: string;
  endsAt: string;
  address: string;
  notes?: string;
}) {
  return jsonFetch<CreateBookingResponse>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CancelBookingResponse = {
  ok: boolean;
  booking: {
    public_id: string;
    status: string;
    cancelled_at: string | null;
  };
};

export function updateMyBooking(
  publicId: string,
  payload: { starts_at?: string; ends_at?: string; notes?: string | null }
) {
  return jsonFetch<{ ok: boolean; booking?: BookingCard }>(`/bookings/${publicId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function cancelBooking(publicId: string) {
  return jsonFetch<CancelBookingResponse>(`/bookings/${publicId}/cancel`, {
    method: "PATCH",
  });
}

export type AvailabilityBooking = {
  public_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  source?: "booking" | "block";
  reason?: string | null;
  block_type?: string | null;
};

export type BookingAvailabilityResponse = {
  ok: boolean;
  date: string;
  startUtc: string;
  endUtc: string;
  bookings: AvailabilityBooking[];
  intervals?: AvailabilityBooking[];
  isClosedAllDay?: boolean;
  closedReason?: string | null;
};

export function getBookingAvailability(params: { date: string; tzOffsetMinutes: number }) {
  const qs = new URLSearchParams({
    date: params.date,
    tzOffsetMinutes: String(params.tzOffsetMinutes),
  });
  return jsonFetch<BookingAvailabilityResponse>(`/bookings/availability?${qs.toString()}`, { method: "GET" });
}