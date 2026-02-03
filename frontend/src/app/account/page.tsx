"use client";

import { useEffect, useState } from "react";
import { me, logout as apiLogout } from "../../lib/api/auth";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    me()
      .then(setData)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Not logged in"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Account</h1>

      {err ? (
        <div className="rounded-xl border p-3 text-sm">{err}</div>
      ) : null}

      {data ? (
        <pre className="rounded-xl border p-4 text-xs overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p className="text-sm">Loading...</p>
      )}

      <button
        className="rounded-xl border px-4 py-2 text-sm font-semibold"
        onClick={async () => {
          await apiLogout().catch(() => {});
          router.push("/login");
        }}
      >
        Logout
      </button>
    </main>
  );
}
