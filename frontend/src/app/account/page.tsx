"use client";

import { useEffect, useMemo, useState } from "react";
import { me, logout as apiLogout, type MeResponse } from "../../lib/api/auth";
import { getMyBookings, type BookingCard } from "../../lib/api/bookings";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

type AccountUser = NonNullable<MeResponse["user"]>;
type Tab = "bookings" | "profile";

function displayName(u: AccountUser) {
  const first = (u.first_name || "").trim();
  const last = (u.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || u.email;
}


function formatBookingTimeRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;

  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

function StatusPill({ status }: { status: BookingCard["status"] }) {
  const label =
    status === "pending"
      ? "Pending"
      : status === "accepted"
      ? "Accepted"
      : status === "assigned"
      ? "Assigned"
      : status === "completed"
      ? "Completed"
      : "Cancelled";

  return (
    <span
      className="rounded-full border px-2 py-1 text-xs"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
    >
      {label}
    </span>
  );
}

function BookingCardUI({ b }: { b: BookingCard }) {
  return (
    <div
      className="rounded-2xl border p-4 space-y-2"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{b.service_title}</div>
          <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
            {formatBookingTimeRange(b.starts_at, b.ends_at)}
          </div>
          <div className="mt-1 text-sm truncate" style={{ color: "rgb(var(--muted))" }}>
            {b.address}
          </div>
        </div>

        <StatusPill status={b.status} />
      </div>

      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
        Booking ID: <span className="font-mono">{b.public_id}</span>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("bookings");
  const [accountUser, setUser] = useState<AccountUser | null>(null);
  const [upcoming, setUpcoming] = useState<BookingCard[]>([]);
  const [history, setHistory] = useState<BookingCard[]>([]);
  const [data, setData] = useState<MeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
    
  
  const greeting = useMemo(() => {
      if (!accountUser) return "Account";
      return displayName(accountUser);
   }, [accountUser]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [meRes, bookingsRes] = await Promise.all([me(), getMyBookings()]);
        const res = await me();
        if (!alive) return;

        if (!meRes?.ok || !meRes.user) {
          setErr("Not authenticated");
          router.replace("/login");
          return;
        }

        setUser(meRes.user);
        setUpcoming(bookingsRes.upcoming || []);
        setHistory(bookingsRes.history || []);
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Not logged in";
        setErr(msg);
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function onLogout() {
    try {
      await apiLogout();
    } catch {
      // ignore
    } finally {
      router.push("/login");
    }
  }

  const user = data?.user;

  return (
    <main className="h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold">Account</h1>
                    <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                      View your profile details and manage your account.
                    </p>
                  </div>

                  <button
                    className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    onClick={onLogout}
                    disabled={loading}
                  >
                    Logout
                  </button>
                </div>
                  <section 
                    className="rounded-2xl border p-5"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  >
                            <button
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      tab === "bookings" ? "" : "opacity-70"
                    }`}
                    style={{ background: tab === "bookings" ? "rgba(var(--bg), 0.35)" : "transparent" }}
                    onClick={() => setTab("bookings")}
                  >
                    Bookings
                  </button>
                  <button
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      tab === "profile" ? "" : "opacity-70"
                    }`}
                    style={{ background: tab === "profile" ? "rgba(var(--bg), 0.35)" : "transparent" }}
                    onClick={() => setTab("profile")}
                  >
                    Profile
                  </button>


                  </section>
                {err ? (
                  <div
                    className="rounded-xl border p-3 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  >
                    {err}
                  </div>
                ) : null}

                {loading ? (
                  <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                    Loading…
                  </p>
                ) : user ? (
                  <section
                    className="rounded-2xl border p-5"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="text-lg font-semibold">{displayName(user)}</div>
                      <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                        {user.email}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Info label="Account type" value={user.account_type ?? "—"} />
                      <Info label="Phone" value={user.phone ?? "—"} />
                      <Info label="Address" value={user.address ?? "—"} />
                      <Info
                        label="Public ID"
                        value={user.public_id ?? "—"}
                        mono
                      />
                      <Info
                        label="Email verified"
                        value={user.email_verified_at ? "Yes" : "No"}
                      />
                      <Info label="Created" value={formatIso(user.created_at)} />
                    </div>

                    {/* Optional: debug JSON (handy during dev) */}
                    <details className="mt-5">
                      <summary className="cursor-pointer text-sm font-semibold" style={{ color: "rgb(var(--muted))" }}>
                        Debug JSON
                      </summary>
                      <pre className="mt-3 overflow-auto rounded-xl border p-4 text-xs"
                        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.4)" }}
                      >
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </details>
                  </section>
                ) : (
                  <div
                    className="rounded-xl border p-3 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  >
                    No user data.
                  </div>
                )}
        </div>
    </main>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border p-3"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {label}
      </div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function formatIso(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}