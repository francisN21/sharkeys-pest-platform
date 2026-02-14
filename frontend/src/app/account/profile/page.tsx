"use client";

import { useEffect, useMemo, useState } from "react";
import { me, type MeResponse } from "../../../lib/api/auth";
import { useRouter } from "next/navigation";

type AccountUser = NonNullable<MeResponse["user"]>;

function displayName(u: AccountUser) {
  const first = (u.first_name || "").trim();
  const last = (u.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || u.email;
}

function firstNameOrFallback(u: AccountUser) {
  const first = (u.first_name || "").trim();
  if (first) return first;
  const full = displayName(u);
  // if displayName fell back to email, make it friendlier
  if (full.includes("@")) return "there";
  return full.split(" ")[0] || "there";
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatAccountType(v?: string | null) {
  if (!v) return "—";
  const s = v.trim().toLowerCase();
  if (s === "residential") return "Residential";
  if (s === "business") return "Business";
  return v;
}

function formatVerified(v?: string | null) {
  return v ? "Verified" : "Not verified";
}

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await me();
        if (!alive) return;

        if (!res?.ok || !res.user) {
          setErr("Not authenticated");
          router.replace("/login");
          return;
        }

        setData(res);
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

  const user = data?.user ?? null;

  const headerSubtitle = useMemo(() => {
    if (!user) return "View your profile details and manage your account.";
    const joined = formatDate(user.created_at);
    return `Manage your profile details. Joined ${joined}.`;
  }, [user]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
            {headerSubtitle}
          </p>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading…
        </div>
      ) : user ? (
        <section className="space-y-4">
          {/* Hero */}
          <div
            className="rounded-2xl border p-5 sm:p-6"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                  Hi, <span className="font-semibold" style={{ color: "rgb(var(--text))" }}>{firstNameOrFallback(user)}</span> 👋
                </div>

                <div className="mt-1 text-lg font-semibold truncate">{displayName(user)}</div>
                <div className="mt-1 text-sm truncate" style={{ color: "rgb(var(--muted))" }}>
                  {user.email}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill label={formatVerified(user.email_verified_at)} />
                  <Pill label={`Joined ${formatDate(user.created_at)}`} />
                  {user.account_type ? <Pill label={formatAccountType(user.account_type)} /> : null}
                </div>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Account type" value={formatAccountType(user.account_type)} />
            <Info label="Phone" value={user.phone ?? "—"} />
            <Info label="Address" value={user.address ?? "—"} />
            <Info label="Email verified" value={user.email_verified_at ? "Yes" : "No"} />
            <Info label="Joined" value={formatDateTime(user.created_at)} />
            {/* Keep public_id out of the main flow in production, but still accessible */}
            <Info label="Public ID" value={user.public_id ?? "—"} mono />
          </div>

          {/* Helpful note (no debug JSON) */}
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          >
            <div className="font-semibold">Need to update something?</div>
            <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
              If any of your details are incorrect, contact support or your administrator to update your account information.
            </div>
          </div>
        </section>
      ) : (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          No user data.
        </div>
      )}
    </main>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
      {label}
    </span>
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
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {label}
      </div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}