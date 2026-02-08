"use client";

import { useEffect, useState } from "react";
import { me, logout as apiLogout, type MeResponse } from "../../../lib/api/auth";
import { useRouter } from "next/navigation";

type AccountUser = NonNullable<MeResponse["user"]>;

function displayName(u: AccountUser) {
  const first = (u.first_name || "").trim();
  const last = (u.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || u.email;
}

export default function AccountPage() {
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
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
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