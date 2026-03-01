"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import AuthTextField from "../../../components/forms/AuthTextField";
import { signupSchema, type SignupValues } from "../../../lib/validators/auth";
import { signup, ApiError, me } from "../../../lib/api/auth";
import { notifyAuthChanged } from "../../../components/AuthProvider";

function friendlySignupError(e: unknown): string {
  // Our api/auth.ts throws ApiError on non-2xx
  if (e instanceof ApiError) {
    // Common cases
    if (e.status === 409) return e.message || "Email already in use.";
    if (e.status === 400) return e.message || "Please check your input and try again.";
    if (e.status === 401) return "Please sign in again.";
    if (e.status === 403) return "You’re not allowed to do that.";
    return e.message || "Signup failed.";
  }

  if (e instanceof Error) return e.message;
  return "Signup failed.";
}

export default function SignupPage() {
  const router = useRouter();

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      accountType: "residential",
      agree: true,
    },
  });

  // Optional UX: if user is already signed in, redirect them out of signup
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await me();
        if (!alive) return;
        if (r?.ok && r.user?.public_id) {
          router.replace("/account");
        }
      } catch {
        // ignore; not logged in
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  async function onSubmit(values: SignupValues) {
    setServerError(null);

    await signup(values);

    // Backend sets cookie session; tell app to refresh auth state
    notifyAuthChanged();

    // Go straight to account; avoid flashing "ok" message
    router.push("/account");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
          Create your customer account to schedule service and manage bookings.
        </p>
      </div>

      {serverError && (
        <div className="rounded-xl border p-3 text-sm border-red-500">
          {serverError}
        </div>
      )}

      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (v) => {
          try {
            await onSubmit(v);
          } catch (e: unknown) {
            setServerError(friendlySignupError(e));
          }
        })}
      >
        {/* First + Last */}
        <div className="grid gap-3 sm:grid-cols-2">
          <AuthTextField
            label="First name"
            placeholder="Juan"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <AuthTextField
            label="Last name"
            placeholder="Dela Cruz"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <AuthTextField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthTextField
          label="Phone"
          placeholder="(707) 000-0000"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Account type (optional)</label>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              {...register("accountType")}
            >
              <option value="residential">Residential</option>
              <option value="business">Business</option>
            </select>
          </div>

          <AuthTextField
            label="Address (optional)"
            placeholder="123 Main St, Benicia, CA"
            error={errors.address?.message}
            {...register("address")}
          />
        </div>

        <AuthTextField
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register("password")}
        />

        <AuthTextField
          label="Confirm password"
          type="password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" {...register("agree")} />
          <span style={{ color: "rgb(var(--muted))" }}>I agree to the terms (optional)</span>
        </label>

        <button
          disabled={isSubmitting}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
          style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
        >
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-center" style={{ color: "rgb(var(--muted))" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}