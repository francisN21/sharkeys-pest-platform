"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { me, updateMe, type MeResponse, type UpdateMePayload } from "../../../lib/api/auth";

type AccountUser = NonNullable<MeResponse["user"]>;
type AccountType = "" | "residential" | "business";

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  account_type: AccountType;
};

type MeUserWithRoles = AccountUser & {
  roles?: string[] | null;
  user_role?: string | null;
};

type MeResponseWithRoles = MeResponse & {
  user?: MeUserWithRoles;
};

function displayName(u: AccountUser) {
  const first = (u.first_name ?? "").trim();
  const last = (u.last_name ?? "").trim();
  const full = `${first} ${last}`.trim();
  return full || u.email;
}

function firstNameOrFallback(u: AccountUser) {
  const first = (u.first_name ?? "").trim();
  return first || "there";
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatAccountType(v?: string | null): string {
  if (!v) return "—";
  const s = v.trim().toLowerCase();
  if (s === "residential") return "Residential";
  if (s === "business") return "Business";
  return v;
}

function toAccountType(v?: string | null): AccountType {
  if (!v) return "";
  const s = v.trim().toLowerCase();
  return s === "residential" ? "residential" : s === "business" ? "business" : "";
}

function clean(v: string) {
  return v.trim();
}

function buildDiffPayload(form: FormState, user: AccountUser): UpdateMePayload {
  const payload: UpdateMePayload = {};

  const uFirst = clean(user.first_name ?? "");
  const uLast = clean(user.last_name ?? "");
  const uPhone = clean(user.phone ?? "");
  const uAddr = clean(user.address ?? "");
  const uType: AccountType = toAccountType(user.account_type);

  const fFirst = clean(form.first_name);
  const fLast = clean(form.last_name);
  const fPhone = clean(form.phone);
  const fAddr = clean(form.address);
  const fType: AccountType = form.account_type;

  if (fFirst !== uFirst) payload.first_name = fFirst || undefined;
  if (fLast !== uLast) payload.last_name = fLast || undefined;
  if (fPhone !== uPhone) payload.phone = fPhone || undefined;
  if (fAddr !== uAddr) payload.address = fAddr || undefined;
  if (fType !== uType) payload.account_type = fType || undefined;

  (Object.keys(payload) as (keyof UpdateMePayload)[]).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });

  return payload;
}

function isSuperUser(res: MeResponse | null) {
  if (!res) return false;

  const withRoles = res as MeResponseWithRoles;
  const rolesRaw = withRoles.user?.roles ?? null;
  if (!rolesRaw || !Array.isArray(rolesRaw)) return false;

  return rolesRaw.map((r) => String(r).trim().toLowerCase()).includes("superuser");
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.14)" }}
    >
      <div className="mb-3">
        <div className="text-sm font-semibold sm:text-base">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-xs sm:text-sm" style={{ color: "rgb(var(--muted))" }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function AccountViewPage() {
  const router = useRouter();

  const [data, setData] = useState<MeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const user = data?.user ?? null;
  const isSU = useMemo(() => isSuperUser(data), [data]);

  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    account_type: "",
  });

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

        const u = res.user as AccountUser;
        setForm({
          first_name: u.first_name ?? "",
          last_name: u.last_name ?? "",
          phone: u.phone ?? "",
          address: u.address ?? "",
          account_type: toAccountType(u.account_type),
        });
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

  const hasChanges = useMemo(() => {
    if (!user) return false;
    const payload = buildDiffPayload(form, user);
    return Object.keys(payload).length > 0;
  }, [form, user]);

  function resetToUser() {
    if (!user) return;
    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
      address: user.address ?? "",
      account_type: toAccountType(user.account_type),
    });
  }

  async function onSave() {
    if (!user) return;

    const payload = buildDiffPayload(form, user);
    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      setErr(null);
      setOkMsg(null);

      const res = await updateMe(payload);
      if (!res?.ok || !res.user) throw new Error("Failed to update profile");

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          user: { ...(prev.user as AccountUser), ...(res.user as AccountUser) },
        };
      });

      setOkMsg("Profile updated.");
      router.refresh();
      setEditing(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function onCancelEdit() {
    resetToUser();
    setErr(null);
    setOkMsg(null);
    setEditing(false);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-2 py-3 sm:px-4 sm:py-6">
      <section className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Account</h1>
            <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Manage your profile, contact details, and account information.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {isSU ? (
              <button
                type="button"
                onClick={() => router.push("/owner-dashboard")}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                disabled={loading || !user || saving}
              >
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M4 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M8 16V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 16V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16 16V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Owner Dashboard
                </span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (!editing) {
                  setErr(null);
                  setOkMsg(null);
                  setEditing(true);
                } else {
                  onCancelEdit();
                }
              }}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              disabled={loading || !user || saving}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path
                    d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                {editing ? "Cancel" : "Edit"}
              </span>
            </button>
          </div>
        </div>

        {err ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
          >
            {err}
          </div>
        ) : null}

        {okMsg ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
          >
            {okMsg}
          </div>
        ) : null}

        {loading ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
          >
            Loading…
          </div>
        ) : user ? (
          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3 sm:space-y-4">
              <div
                className="rounded-2xl border p-3 sm:p-4"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                        Hi,{" "}
                        <span className="font-semibold" style={{ color: "rgb(var(--text))" }}>
                          {firstNameOrFallback(user)}
                        </span>{" "}
                        👋
                      </div>

                      <div className="mt-1 break-words text-lg font-semibold sm:text-xl">
                        {displayName(user)}
                      </div>

                      <div className="mt-1 break-words text-sm" style={{ color: "rgb(var(--muted))" }}>
                        {user.email}
                      </div>
                    </div>

                    {editing ? (
                      <div
                        className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                        style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}
                      >
                        {hasChanges ? "Unsaved changes" : "No changes yet"}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Pill label={user.email_verified_at ? "Verified" : "Not verified"} />
                    <Pill label={formatAccountType(user.account_type)} />
                    <Pill label={`Joined ${formatDate(user.created_at)}`} />
                    {isSU ? <Pill label="Superuser" /> : null}
                  </div>
                </div>
              </div>

              <SectionCard
                title="Profile details"
                subtitle="Keep your contact details up to date for scheduling and notifications."
              >
                {!editing ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Info label="First name" value={user.first_name ?? "—"} />
                    <Info label="Last name" value={user.last_name ?? "—"} />
                    <Info label="Phone" value={user.phone ?? "—"} />
                    <Info label="Account type" value={formatAccountType(user.account_type)} />
                    <div className="sm:col-span-2">
                      <Info label="Address" value={user.address ?? "—"} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="First name">
                        <input
                          value={form.first_name}
                          onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                          className="w-full rounded-xl border px-3 py-2.5 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                          placeholder="First name"
                        />
                      </Field>

                      <Field label="Last name">
                        <input
                          value={form.last_name}
                          onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                          className="w-full rounded-xl border px-3 py-2.5 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                          placeholder="Last name"
                        />
                      </Field>

                      <Field label="Phone number">
                        <input
                          value={form.phone}
                          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                          className="w-full rounded-xl border px-3 py-2.5 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                          placeholder="e.g. 707-555-1234"
                        />
                      </Field>

                      <Field label="Account type">
                        <select
                          value={form.account_type}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              account_type: (e.target.value as AccountType) ?? "",
                            }))
                          }
                          className="w-full rounded-xl border px-3 py-2.5 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        >
                          <option value="">Select…</option>
                          <option value="residential">Residential</option>
                          <option value="business">Business</option>
                        </select>
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Address">
                          <input
                            value={form.address}
                            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm"
                            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                            placeholder="Street, City, State"
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={onCancelEdit}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        disabled={saving}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={onSave}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        disabled={saving || !hasChanges}
                        title={!hasChanges ? "No changes to save" : "Save changes"}
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </>
                )}
              </SectionCard>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <SectionCard title="Account info" subtitle="Read-only account metadata.">
                <div className="grid gap-2">
                  <Info label="Email" value={user.email} />
                  <Info label="Email verified" value={user.email_verified_at ? "Yes" : "No"} />
                  <Info label="Joined" value={formatDateTime(user.created_at)} />
                  <Info label="Public ID" value={user.public_id ?? "—"} mono />
                </div>
              </SectionCard>

              <SectionCard title="Quick summary" subtitle="Fast account overview.">
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Name" value={displayName(user)} />
                  <MiniStat label="Type" value={formatAccountType(user.account_type)} />
                  <MiniStat label="Phone" value={user.phone || "—"} />
                  <MiniStat label="Status" value={user.email_verified_at ? "Verified" : "Pending"} />
                </div>
              </SectionCard>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            No user data.
          </div>
        )}
      </section>
    </main>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgba(var(--bg), 0.20)",
      }}
    >
      {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <div
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "rgb(var(--muted))" }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgba(var(--bg), 0.18)",
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "rgb(var(--muted))" }}
      >
        {label}
      </div>
      <div className={`mt-1 break-words text-sm ${mono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgba(var(--bg), 0.22)",
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "rgb(var(--muted))" }}
      >
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}