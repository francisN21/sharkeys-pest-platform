import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  showToggle?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function AuthTextField({
  label,
  type = "text",
  placeholder,
  error,
  showToggle = false,
  ...rest
}: Props) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showToggle ? (visible ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          placeholder={placeholder}
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: error ? "rgb(239 68 68)" : "rgb(var(--border))",
            background: "rgb(var(--card))",
            color: "rgb(var(--fg))",
            paddingRight: isPassword && showToggle ? "2.5rem" : undefined,
          }}
          {...rest}
        />
        {isPassword && showToggle && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))] transition hover:opacity-80"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p className="text-xs" style={{ color: "rgb(239 68 68)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
