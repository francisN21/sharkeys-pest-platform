import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE || "http://localhost:4000";

export async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid")?.value;
  if (!sid) return false;

  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: {
      cookie: `sid=${sid}`,
    },
    cache: "no-store",
  });

  return res.ok;
}