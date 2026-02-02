type Props = {
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function AuthTextField({
  label,
  type = "text",
  placeholder,
  error,
  ...rest
}: Props) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
        style={{
          borderColor: error ? "rgb(239 68 68)" : "rgb(var(--border))",
          background: "rgb(var(--card))",
          color: "rgb(var(--fg))",
        }}
        {...rest}
      />
      {error ? (
        <p className="text-xs" style={{ color: "rgb(239 68 68)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
