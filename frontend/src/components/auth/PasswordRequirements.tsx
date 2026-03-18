"use client";

import { Check, X } from "lucide-react";

type Props = {
  password: string;
};

function rule(valid: boolean, label: string) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {valid ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span style={{ opacity: valid ? 1 : 0.7 }}>{label}</span>
    </div>
  );
}

export default function PasswordRequirements({ password }: Props) {
  const hasMinLength = password.length >= 14;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const noSpaces = !/\s/.test(password);

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgba(var(--bg), 0.2)",
      }}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide">
        Password requirements
      </p>

      <div className="space-y-1">
        {rule(hasMinLength, "At least 14 characters")}
        {rule(hasUpper, "At least one uppercase letter")}
        {rule(hasLower, "At least one lowercase letter")}
        {rule(hasNumber, "At least one number")}
        {rule(hasSpecial, "At least one special character")}
        {rule(noSpaces, "No spaces")}
      </div>

      <p className="mt-3 text-xs" style={{ color: "rgb(var(--muted))" }}>
        Your new password must also be different from your current password and your 5 most recent passwords.
      </p>
    </div>
  );
}