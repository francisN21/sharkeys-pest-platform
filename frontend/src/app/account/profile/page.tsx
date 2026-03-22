"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock,
  Hash,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { me, updateMe, type MeResponse, type UpdateMePayload } from "../../../lib/api/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayName(u: AccountUser) {
  const first = (u.first_name ?? "").trim();
  const last = (u.last_name ?? "").trim();
  const full = `${first} ${last}`.trim();
  return full || u.email;
}

function firstNameOrFallback(u: AccountUser) {
  return (u.first_name ?? "").trim() || "there";
}

function initials(u: AccountUser) {
  const first = (u.first_name ?? "").trim();
  const last = (u.last_name ?? "").trim();
  const out = `${first ? first[0] : ""}${last ? last[0] : ""}`.toUpperCase();
  return out || (u.email?.[0] ?? "?").toUpperCase();
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
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

  if (clean(form.first_name) !== uFirst) payload.first_name = clean(form.first_name) || undefined;
  if (clean(form.last_name) !== uLast) payload.last_name = clean(form.last_name) || undefined;
  if (clean(form.phone) !== uPhone) payload.phone = clean(form.phone) || undefined;
  if (clean(form.address) !== uAddr) payload.address = clean(form.address) || undefined;
  if (form.account_type !== uType) payload.account_type = form.account_type || undefined;

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

function deriveRole(res: MeResponse | null): "superuser" | "admin" | "technician" | "customer" {
  if (!res) return "customer";
  const u = res.user as MeUserWithRoles | null | undefined;
  const roles = (u?.roles ?? []).map((r) => String(r).toLowerCase());
  if (roles.includes("superuser") || u?.user_role === "superuser") return "superuser";
  if (roles.includes("admin") || u?.user_role === "admin") return "admin";
  if (roles.includes("worker") || u?.user_role === "worker") return "technician";
  return "customer";
}

function roleDisplayMeta(role: "superuser" | "admin" | "technician" | "customer") {
  switch (role) {
    case "superuser":
      return { label: "Owner", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", text: "rgb(167 243 208)", ring: "rgba(52,211,153,0.45)" };
    case "admin":
      return { label: "Admin", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", text: "rgb(167 243 208)", ring: "rgba(52,211,153,0.45)" };
    case "technician":
      return { label: "Technician", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.35)", text: "rgb(186 230 253)", ring: "rgba(56,189,248,0.45)" };
    case "customer":
    default:
      return { label: "Customer", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", text: "rgb(253 230 138)", ring: "rgba(245,158,11,0.45)" };
  }
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition";

const SELECT_CLS =
  "h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[rgb(var(--fg))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition";

function SectionCard({
  icon,
  title,
  subtitle,
  accentClass = "bg-sky-500/10 text-sky-400",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accentClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-[rgb(var(--fg))]">{title}</div>
          {subtitle ? <div className="text-xs text-[rgb(var(--muted))]">{subtitle}</div> : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {label}
      </div>
      <div className={`mt-1 break-words text-sm text-[rgb(var(--fg))] ${mono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-[rgb(var(--muted))]">{label}</div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountViewPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [data, setData] = useState<MeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const user = data?.user ?? null;
  const isSU = useMemo(() => isSuperUser(data), [data]);
  const role = useMemo(() => deriveRole(data), [data]);
  const roleMeta = useMemo(() => roleDisplayMeta(role), [role]);

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
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  const hasChanges = useMemo(() => {
    if (!user) return false;
    return Object.keys(buildDiffPayload(form, user)).length > 0;
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
    if (Object.keys(payload).length === 0) { setEditing(false); return; }

    try {
      setSaving(true);
      setErr(null);
      setOkMsg(null);

      const res = await updateMe(payload);
      if (!res?.ok || !res.user) throw new Error("Failed to update profile");

      setData((prev) =>
        prev ? { ...prev, user: { ...(prev.user as AccountUser), ...(res.user as AccountUser) } } : prev
      );

      setOkMsg("Profile updated successfully.");
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

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading profile…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
        No user data found.
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Banners */}
      <AnimatePresence>
        {err ? (
          <motion.div
            key="err"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <span>{err}</span>
            <button type="button" onClick={() => setErr(null)}>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : null}

        {okMsg ? (
          <motion.div
            key="ok"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {okMsg}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Profile Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        {/* Gradient accent */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-sky-500/10 via-indigo-500/8 to-purple-500/10" />

        <div className="relative px-5 pb-5 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Avatar + identity */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold"
                style={{
                  background: roleMeta.bg,
                  boxShadow: `0 0 0 2px ${roleMeta.ring}`,
                  color: roleMeta.text,
                }}
              >
                {initials(user)}
              </div>

              <div className="min-w-0">
                <div className="text-xs text-[rgb(var(--muted))]">
                  Hi, <span className="font-semibold text-[rgb(var(--fg))]">{firstNameOrFallback(user)}</span> 👋
                </div>
                <div className="mt-0.5 break-words text-lg font-bold text-[rgb(var(--fg))] sm:text-xl">
                  {displayName(user)}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {user.email}
                </div>

                {/* Pills */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Role badge */}
                  <span
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                    style={{ borderColor: roleMeta.border, background: roleMeta.bg, color: roleMeta.text }}
                  >
                    {roleMeta.label}
                  </span>

                  {/* Verified */}
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                    style={
                      user.email_verified_at
                        ? { borderColor: "rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.10)", color: "rgb(167 243 208)" }
                        : { borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "rgb(var(--muted))" }
                    }
                  >
                    {user.email_verified_at ? <BadgeCheck className="h-3 w-3" /> : null}
                    {user.email_verified_at ? "Verified" : "Unverified"}
                  </span>

                  {/* Account type */}
                  {user.account_type ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]">
                      {formatAccountType(user.account_type)}
                    </span>
                  ) : null}

                  {/* Joined */}
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]">
                    <Clock className="h-3 w-3" />
                    Joined {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              {isSU ? (
                <button
                  type="button"
                  onClick={() => router.push("/owner-dashboard")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.07]"
                >
                  <BarChart3 className="h-4 w-4" />
                  Owner Dashboard
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
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                {editing ? (
                  <><X className="h-4 w-4" /> Cancel</>
                ) : (
                  <><Pencil className="h-4 w-4" /> Edit Profile</>
                )}
              </button>

              {editing && hasChanges ? (
                <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                  Unsaved changes
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">

        {/* Left: Profile Details */}
        <SectionCard
          icon={<User className="h-4 w-4" />}
          title="Profile Details"
          subtitle="Keep your contact info up to date for scheduling and notifications"
          accentClass="bg-sky-500/10 text-sky-400"
        >
          <AnimatePresence mode="wait">
            {!editing ? (
              <motion.div
                key="view"
                initial={shouldReduceMotion ? undefined : { opacity: 0 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="grid gap-2 sm:grid-cols-2"
              >
                <InfoTile label="First name" value={user.first_name || "—"} />
                <InfoTile label="Last name" value={user.last_name || "—"} />
                <InfoTile label="Phone" value={user.phone || "—"} />
                <InfoTile label="Account type" value={formatAccountType(user.account_type)} />
                <div className="sm:col-span-2">
                  <InfoTile label="Address" value={user.address || "—"} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="edit"
                initial={shouldReduceMotion ? undefined : { opacity: 0 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="space-y-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldLabel label="First name">
                    <input
                      value={form.first_name}
                      onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                      className={INPUT_CLS}
                      placeholder="First name"
                    />
                  </FieldLabel>

                  <FieldLabel label="Last name">
                    <input
                      value={form.last_name}
                      onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                      className={INPUT_CLS}
                      placeholder="Last name"
                    />
                  </FieldLabel>

                  <FieldLabel label="Phone number">
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className={INPUT_CLS}
                      placeholder="e.g. 707-555-1234"
                      type="tel"
                    />
                  </FieldLabel>

                  <FieldLabel label="Account type">
                    <select
                      value={form.account_type}
                      onChange={(e) => setForm((p) => ({ ...p, account_type: (e.target.value as AccountType) ?? "" }))}
                      className={SELECT_CLS}
                    >
                      <option value="">Select…</option>
                      <option value="residential">Residential</option>
                      <option value="business">Business</option>
                    </select>
                  </FieldLabel>

                  <div className="sm:col-span-2">
                    <FieldLabel label="Address">
                      <input
                        value={form.address}
                        onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                        className={INPUT_CLS}
                        placeholder="Street, City, State"
                      />
                    </FieldLabel>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.07] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <motion.button
                    type="button"
                    onClick={onSave}
                    disabled={saving || !hasChanges}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.01, y: -1 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-fg))] shadow-lg shadow-black/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    title={!hasChanges ? "No changes to save" : "Save changes"}
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SectionCard>

        {/* Right: Account Info */}
        <div className="space-y-5">
          <SectionCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Account Info"
            subtitle="Read-only account metadata"
            accentClass="bg-emerald-500/10 text-emerald-400"
          >
            <div className="grid gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  <Mail className="h-3 w-3" />
                  Email
                </div>
                <div className="mt-1 break-all text-sm text-[rgb(var(--fg))]">{user.email}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  <BadgeCheck className="h-3 w-3" />
                  Verification
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: user.email_verified_at ? "rgb(167 243 208)" : "rgb(var(--muted))" }}
                  >
                    {user.email_verified_at ? "Email verified" : "Not yet verified"}
                  </span>
                  {user.email_verified_at ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : null}
                </div>
                {user.email_verified_at ? (
                  <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                    {formatDateTime(user.email_verified_at)}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  <Clock className="h-3 w-3" />
                  Member since
                </div>
                <div className="mt-1 text-sm text-[rgb(var(--fg))]">{formatDateTime(user.created_at)}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  <MapPin className="h-3 w-3" />
                  Address on file
                </div>
                <div className="mt-1 text-sm text-[rgb(var(--fg))]">{user.address || "—"}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  <Phone className="h-3 w-3" />
                  Phone
                </div>
                <div className="mt-1 text-sm text-[rgb(var(--fg))]">{user.phone || "—"}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  <Hash className="h-3 w-3" />
                  Public ID
                </div>
                <div className="mt-1 break-all font-mono text-[13px] text-[rgb(var(--fg))]">
                  {user.public_id ?? "—"}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
