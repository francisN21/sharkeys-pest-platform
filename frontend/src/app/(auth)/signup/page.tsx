"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthTextField from "../../../components/forms/AuthTextField";
import { signupSchema, type SignupValues } from "../../../lib/validators/auth";
import { signup } from "../../../lib/api/auth";

export default function SignupPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

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

  async function onSubmit(values: SignupValues) {
    setServerError(null);
    setOkMsg(null);

    // If "agree" becomes required later, enforce here or in schema.
    await signup(values);
    setOkMsg("Account created! You’re now signed in.");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
          Create your customer account to schedule service and manage bookings.
        </p>
      </div>

      {serverError ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {serverError}
        </div>
      ) : null}

      {okMsg ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(34 197 94)" }}>
          {okMsg}
        </div>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (v) => {
          try {
            await onSubmit(v);
          } catch (e: unknown) {
            if(e instanceof Error){
              setServerError(e.message);
            } else {
              setServerError("Signup failed")
            }
          }
        })}
      >
        <AuthTextField
          label="Full name"
          placeholder="John Doe"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

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

        {/* optional fields now, not required */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Account type (optional)</label>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
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
          <span style={{ color: "rgb(var(--muted))" }}>
            I agree to the terms (optional for now)
          </span>
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
        <Link className="font-semibold hover:underline" href="/login" style={{ color: "rgb(var(--fg))" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}