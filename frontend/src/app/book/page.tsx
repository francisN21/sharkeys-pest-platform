"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { getServices, type Service } from "../../lib/api/services";
import { createBooking } from "../../lib/api/bookings";
import { me, type MeResponse } from "../../lib/api/auth";

/**
 * Convert a datetime-local string (e.g. "2026-02-08T14:30") to ISO string.
 * Treats input as local time.
 */
function dollarsFromCents(cents?: number | null) {
  if (typeof cents !== "number") return null;
  return (cents / 100).toFixed(2);
}

function localDateTimeToIso(value: string) {
  const d = new Date(value);
  return d.toISOString();
}

function addMinutesIso(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BookPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // user
  const [user, setUser] = useState<MeResponse["user"] | null>(null);

  // form state
  const [servicePublicId, setServicePublicId] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState(""); // datetime-local input value

  // address UX
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [serviceAddress, setServiceAddress] = useState(""); // only used when checkbox is ON

  const [notes, setNotes] = useState("");

  const selectedService = useMemo(
    () => services.find((s) => s.public_id === servicePublicId) || null,
    [services, servicePublicId]
  );

  const durationMinutes = selectedService?.duration_minutes ?? 60;

  const computedEndsAtIso = useMemo(() => {
    if (!startsAtLocal) return null;
    const startsIso = localDateTimeToIso(startsAtLocal);
    return addMinutesIso(startsIso, durationMinutes);
  }, [startsAtLocal, durationMinutes]);

  const defaultAddress = (user?.address || "").trim();

  const finalAddress = useMemo(() => {
    return useDifferentAddress ? serviceAddress.trim() : defaultAddress;
  }, [useDifferentAddress, serviceAddress, defaultAddress]);

  // Load services
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingServices(true);
        setError(null);

        const res = await getServices();
        if (!alive) return;

        const list = res.services || [];
        setServices(list);

        if (!servicePublicId && list.length) {
          setServicePublicId(list[0].public_id);
        }
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to load services";
        setError(msg);
      } finally {
        if (alive) setLoadingServices(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load current user (for address prefill)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingMe(true);
        const res = await me();
        if (!alive) return;

        if (!res?.ok || !res.user) {
          router.replace("/login");
          return;
        }

        setUser(res.user);

        // If user has no saved address, automatically force different-address mode
        if (!res.user.address || res.user.address.trim().length < 5) {
          setUseDifferentAddress(true);
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      } finally {
        if (alive) setLoadingMe(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);

    if (!servicePublicId) return setError("Please select a service.");
    if (!startsAtLocal) return setError("Please select a date and time.");
    if (!computedEndsAtIso) return setError("Could not compute end time.");

    // Address rules:
    // - If checkbox is OFF, we require user.address to exist.
    // - If checkbox is ON, we require serviceAddress input.
    if (!useDifferentAddress) {
      if (defaultAddress.length < 5) {
        return setError("Your account has no saved address. Please use a different address.");
      }
    } else {
      if (serviceAddress.trim().length < 5) {
        return setError("Please enter a valid address (at least 5 characters).");
      }
    }

    const startsAtIso = localDateTimeToIso(startsAtLocal);

    try {
      setLoadingSubmit(true);

      await createBooking({
        servicePublicId,
        startsAt: startsAtIso,
        endsAt: computedEndsAtIso,
        address: finalAddress,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      setSuccessMsg("Booking created! Redirecting to your account…");
      setTimeout(() => router.push("/account"), 700);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create booking";
      setError(msg);
    } finally {
      setLoadingSubmit(false);
    }
  }

  const pageLoading = loadingServices || loadingMe;

  return (
    <main className="h-screen overflow-y-auto scroll-smooth">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Book a Service</h1>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Pick a service, choose a time, and confirm your booking.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
            {error}
          </div>
        ) : null}

        {successMsg ? (
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(34 197 94)" }}>
            {successMsg}
          </div>
        ) : null}

        <div
          className="rounded-2xl border p-6 space-y-6"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          {pageLoading ? (
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Loading…
            </div>
          ) : (
            <form className="space-y-6" onSubmit={onSubmit}>
              {/* SERVICE PICKER */}
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="text-sm font-semibold">Service</label>
                  {selectedService ? (
                    <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Selected: <span className="font-semibold">{selectedService.title}</span>
                    </div>
                  ) : null}
                </div>

                {/* Mobile dropdown */}
                <div className="sm:hidden">
                  <select
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                    value={servicePublicId}
                    onChange={(e) => setServicePublicId(e.target.value)}
                  >
                    {services.map((s) => (
                      <option key={s.public_id} value={s.public_id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desktop cards */}
                <div className="hidden sm:grid grid-cols-2 gap-3">
                  {services.map((s) => {
                    const active = s.public_id === servicePublicId;
                    const price = dollarsFromCents(s.base_price_cents);
                    const duration = s.duration_minutes ?? 60;

                    return (
                      <button
                        key={s.public_id}
                        type="button"
                        onClick={() => setServicePublicId(s.public_id)}
                        className={cn("text-left rounded-2xl border p-4 transition hover:opacity-95", active && "ring-2")}
                        style={{
                          borderColor: "rgb(var(--border))",
                          background: active ? "rgba(var(--bg), 0.45)" : "rgba(var(--bg), 0.30)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{s.title}</div>
                            <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                              {s.description}
                            </div>
                          </div>

                          {active ? (
                            <span
                              className="rounded-full border px-2 py-1 text-xs"
                              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                            >
                              Selected
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                          <span className="rounded-full border px-2 py-1" style={{ borderColor: "rgb(var(--border))" }}>
                            {duration} min
                          </span>
                          {price ? (
                            <span className="rounded-full border px-2 py-1" style={{ borderColor: "rgb(var(--border))" }}>
                              ${price}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TIME */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Start date & time</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                    value={startsAtLocal}
                    onChange={(e) => setStartsAtLocal(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">End time (auto)</label>
                  <div
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
                  >
                    {computedEndsAtIso ? new Date(computedEndsAtIso).toLocaleString() : "—"}
                  </div>
                </div>
              </div>

              {/* ADDRESS */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <label className="text-sm font-semibold">Service address</label>
                </div>

                {/* Default address display */}
                <div
                  className="rounded-xl border p-3 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                >
                  <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                    Using your saved address
                  </div>
                  <div className="mt-1">
                    {defaultAddress ? defaultAddress : <span style={{ color: "rgb(239 68 68)" }}>No saved address</span>}
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useDifferentAddress}
                      onChange={(e) => setUseDifferentAddress(e.target.checked)}
                    />
                    Use a different address
                  </label>
                </div>

                {/* Different address input */}
                {useDifferentAddress ? (
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                    placeholder="Enter service address"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                  />
                ) : null}
              </div>

              {/* NOTES */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Notes (optional)</label>
                <textarea
                  className="w-full min-h-[110px] rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                  placeholder="Gate code, pets on-site, anything we should know…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                />
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  {notes.length}/2000
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", background: "transparent" }}
                  onClick={() => router.push("/account")}
                  disabled={loadingSubmit}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  disabled={loadingSubmit}
                >
                  {loadingSubmit ? "Booking…" : "Confirm Booking"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}