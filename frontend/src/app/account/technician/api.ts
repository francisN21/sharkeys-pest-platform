import type { WorkerBookingRow } from "../../../lib/api/workerBookings";
import {
  workerListAssignedBookings,
  workerListJobHistory,
} from "../../../lib/api/workerBookings";
import { jsonFetch } from "../../../lib/api/http";
import type { BookingPriceResponse } from "./types";
import { clampNonNegInt } from "./helpers";

export async function getBookingPrice(publicId: string) {
  return jsonFetch<BookingPriceResponse>(`/bookings/${encodeURIComponent(publicId)}/price`);
}

export async function setFinalPrice(publicId: string, finalPriceCents: number) {
  const cents = clampNonNegInt(finalPriceCents);
  return jsonFetch<BookingPriceResponse>(`/bookings/${encodeURIComponent(publicId)}/price`, {
    method: "PATCH",
    body: JSON.stringify({ final_price_cents: cents }),
  });
}

export async function findWorkerBookingByPublicId(publicId: string): Promise<WorkerBookingRow | null> {
  const assigned = await workerListAssignedBookings();
  const assignedFound = (assigned.bookings || []).find((b) => b.public_id === publicId) ?? null;
  if (assignedFound) return assignedFound;

  const firstHistory = await workerListJobHistory(1, 50);
  const firstFound = (firstHistory.bookings || []).find((b) => b.public_id === publicId) ?? null;
  if (firstFound) return firstFound;

  const totalPages = firstHistory.totalPages || 1;
  for (let page = 2; page <= totalPages; page++) {
    const res = await workerListJobHistory(page, 50);
    const found = (res.bookings || []).find((b) => b.public_id === publicId) ?? null;
    if (found) return found;
  }

  return null;
}