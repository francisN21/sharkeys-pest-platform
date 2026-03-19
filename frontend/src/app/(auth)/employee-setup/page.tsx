"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { completeEmployeeSetup } from "../../../lib/api/employees";

export default function EmployeeSetupPage() {
  const token = useSearchParams().get("token") || "";

  const [password, setPassword] = useState("");

  async function submit() {
    await completeEmployeeSetup({ token, password });
    window.location.href = "/login";
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-xl font-semibold">Complete Setup</h1>

      <input
        type="password"
        placeholder="Create password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={submit}>Complete</button>
    </div>
  );
}