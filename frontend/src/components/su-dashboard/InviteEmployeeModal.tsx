"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Mail,
  Phone,
  Shield,
  User,
  Wrench,
  UserCog,
  X,
} from "lucide-react";
import { inviteEmployee } from "../../lib/api/employees";

type InviteEmployeeForm = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_role: string;
};

const INITIAL_FORM: InviteEmployeeForm = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  user_role: "technician",
};

function roleMeta(role: string) {
  switch (role) {
    case "admin":
      return {
        label: "Admin",
        desc: "Can manage operations and internal workflows.",
        icon: UserCog,
      };
    case "superadmin":
      return {
        label: "Super Admin",
        desc: "Full access to employees, operations, and platform controls.",
        icon: Shield,
      };
    case "technician":
    default:
      return {
        label: "Technician",
        desc: "Handles field work, service visits, and assigned bookings.",
        icon: Wrench,
      };
  }
}

export default function InviteEmployeeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<InviteEmployeeForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  const shouldReduceMotion = useReducedMotion();
  const selectedRole = useMemo(() => roleMeta(form.user_role), [form.user_role]);

  useEffect(() => {
    if (!open) {
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!showSuccess) return;

    const timer = window.setTimeout(() => {
      setShowSuccess(false);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [showSuccess]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, submitting]);

  function updateField<K extends keyof InviteEmployeeForm>(
    key: K,
    value: InviteEmployeeForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setError("");
    setSubmitting(false);
  }

  async function submit() {
    if (submitting) return;

    setError("");

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!form.first_name.trim()) {
      setError("First name is required.");
      return;
    }

    if (!form.last_name.trim()) {
      setError("Last name is required.");
      return;
    }

    try {
      setSubmitting(true);

      await inviteEmployee({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        user_role: form.user_role,
      });

      onSuccess();
      onClose();
      setShowSuccess(true);
      resetForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send employee invite.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const backdropAnim = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18 },
      };

  const modalAnim = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18, scale: 0.97, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, y: 10, scale: 0.98, filter: "blur(4px)" },
        transition: {
          type: "spring",
          stiffness: 320,
          damping: 28,
          mass: 0.8,
        },
      };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            {...backdropAnim}
            onClick={() => {
              if (!submitting) onClose();
            }}
          >
            <motion.div
              className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[rgb(var(--card))] shadow-2xl"
              {...modalAnim}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-cyan-500/10" />

              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[rgb(var(--fg))] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close invite modal"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative p-6 sm:p-7">
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
                    <User className="h-6 w-6" />
                  </div>

                  <div className="pr-10">
                    <div className="mb-1 inline-flex items-center rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                      Employee Access
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-[rgb(var(--fg))]">
                      Invite Employee
                    </h2>
                    <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                      Create an invitation for a new team member and assign their
                      initial role.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Email"
                    icon={<Mail className="h-4 w-4" />}
                    input={
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="name@company.com"
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Phone"
                    icon={<Phone className="h-4 w-4" />}
                    input={
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="(555) 123-4567"
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="First name"
                    icon={<User className="h-4 w-4" />}
                    input={
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) =>
                          updateField("first_name", e.target.value)
                        }
                        placeholder="First name"
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Last name"
                    icon={<User className="h-4 w-4" />}
                    input={
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) =>
                          updateField("last_name", e.target.value)
                        }
                        placeholder="Last name"
                        className={inputClassName}
                      />
                    }
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-[rgb(var(--fg))]">
                    Role
                  </label>
                  <select
                    value={form.user_role}
                    onChange={(e) => updateField("user_role", e.target.value)}
                    className={inputClassName}
                  >
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <motion.div
                  layout
                  className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--fg))]">
                      <selectedRole.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                        {selectedRole.label}
                      </div>
                      <div className="mt-1 text-sm text-[rgb(var(--muted))]">
                        {selectedRole.desc}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {error ? (
                    <motion.div
                      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
                      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                      className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-[rgb(var(--fg))] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <motion.button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.01, y: -1 }
                    }
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-fg))] shadow-lg shadow-black/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Sending Invite...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Invite
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 25 }}
            className="pointer-events-none fixed inset-x-0 top-5 z-[110] flex justify-center px-4"
          >
            <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 shadow-2xl backdrop-blur-md">
              <div className="mt-0.5 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-200">
                  Invitation sent successfully
                </p>
                <p className="text-sm text-emerald-100/80">
                  Your employee will receive their invite and can complete setup
                  from the email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="ml-auto rounded-full p-1 text-emerald-200/80 transition hover:bg-white/10 hover:text-emerald-100"
                aria-label="Dismiss success message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Field({
  label,
  icon,
  input,
}: {
  label: string;
  icon: React.ReactNode;
  input: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[rgb(var(--fg))]">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]">
          {icon}
        </div>
        <div>{input}</div>
      </div>
    </div>
  );
}

const inputClassName =
  "h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-[rgb(var(--fg))] outline-none transition placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/10";