"use client";

import { useEffect, useRef } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { MapPin } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  /** Controlled value from parent state */
  value: string;
  /** Called on every keystroke and on suggestion selection */
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  id?: string;
  /** Optional label rendered above the input */
  label?: string;
  /** Optional error message rendered below */
  error?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "123 Main St, City, CA",
  className,
  style,
  disabled,
  id,
  label,
  error,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track whether the last value change came from inside this component so we
  // don't override the hook's internal state when the parent echoes our own
  // onChange back to us.
  const isInternalChange = useRef(false);

  const {
    ready,
    value: acValue,
    suggestions: { status, data },
    setValue: setAcValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "us" },
      types: ["address"],
    },
    defaultValue: value,
    debounce: 300,
  });

  // Sync external resets (e.g. form reset sets value → "") into the hook.
  useEffect(() => {
    if (!isInternalChange.current && value !== acValue) {
      setAcValue(value, false); // false = don't trigger a new suggestions fetch
    }
    isInternalChange.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearSuggestions();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [clearSuggestions]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = e.target.value;
    isInternalChange.current = true;
    setAcValue(newVal); // triggers suggestion fetch
    onChange(newVal);
  }

  function handleSelect(description: string) {
    isInternalChange.current = true;
    setAcValue(description, false);
    clearSuggestions();
    onChange(description);
  }

  const inputEl = ready ? (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        value={acValue}
        onChange={handleInput}
        placeholder={placeholder}
        className={className}
        style={style}
        disabled={disabled}
        autoComplete="off"
      />

      {status === "OK" && data.length > 0 ? (
        <ul
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-xl"
          style={{
            background: "rgb(var(--card))",
            borderColor: "rgb(var(--border))",
          }}
        >
          {data.map(({ place_id, description, structured_formatting }) => (
            <li key={place_id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // Use mousedown so it fires before the input's blur, which
                  // would otherwise clear suggestions before the click registers.
                  e.preventDefault();
                  handleSelect(description);
                }}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.06]"
                style={{ color: "rgb(var(--fg))" }}
              >
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: "rgb(var(--muted))" }}
                />
                <span>
                  <span className="font-medium">
                    {structured_formatting.main_text}
                  </span>
                  <span
                    className="ml-1 text-xs"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    {structured_formatting.secondary_text}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : (
    // API not yet loaded — render a plain input as fallback.
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={style}
      disabled={disabled}
    />
  );

  // Without label/error, return the input (or wrapped div) directly.
  if (!label && !error) return inputEl;

  // With label/error, render in an AuthTextField-compatible wrapper.
  return (
    <div className="space-y-1.5">
      {label ? <label className="text-sm font-semibold">{label}</label> : null}
      {inputEl}
      {error ? (
        <p className="text-xs" style={{ color: "rgb(239 68 68)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
