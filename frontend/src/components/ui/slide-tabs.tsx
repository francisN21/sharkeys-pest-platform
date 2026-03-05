// frontend/src/components/ui/slide-tabs.tsx
"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export type SlideTabItem<K extends string> = {
  key: K;
  label: string;
  icon?: string; // keep your FontAwesome class string
  badgeCount?: number;
};

type Position = { left: number; width: number; opacity: number };

export function SlideTabs<K extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<SlideTabItem<K>>;
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  const selectedIndex = useMemo(() => Math.max(0, tabs.findIndex((t) => t.key === value)), [tabs, value]);
  const [position, setPosition] = useState<Position>({ left: 0, width: 0, opacity: 0 });

  const refs = useRef<Array<HTMLLIElement | null>>([]);

  const syncToIndex = (i: number) => {
    const el = refs.current[i];
    if (!el) return;

    const { width } = el.getBoundingClientRect();
    setPosition({
      left: el.offsetLeft,
      width,
      opacity: 1,
    });
  };

  // On mount + whenever selected changes, lock cursor to selected tab
  useLayoutEffect(() => {
    syncToIndex(selectedIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, tabs.length]);

  // Re-sync on resize (responsive widths)
  useEffect(() => {
    const onResize = () => syncToIndex(selectedIndex);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, tabs.length]);

  return (
    <ul
      onMouseLeave={() => syncToIndex(selectedIndex)}
      className={cn(
        "relative w-fit max-w-full flex flex-wrap items-center gap-1 rounded-full border p-1",
        "bg-[rgb(var(--card))] border-[rgb(var(--border))]",
        className
      )}
      aria-label="Account navigation"
      role="tablist"
    >
      {tabs.map((t, i) => {
        const active = t.key === value;
        const badge = typeof t.badgeCount === "number" && t.badgeCount > 0 ? t.badgeCount : 0;

        return (
          <Tab<K>
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            active={active}
            icon={t.icon}
            label={t.label}
            badgeCount={badge}
            onClick={() => onChange(t.key)}
            onHover={() => syncToIndex(i)}
          />
        );
      })}

      <Cursor position={position} />
    </ul>
  );
}

const Tab = React.forwardRef(function TabInner<K extends string>(
  {
    active,
    icon,
    label,
    badgeCount,
    onClick,
    onHover,
  }: {
    active: boolean;
    icon?: string;
    label: string;
    badgeCount?: number;
    onClick: () => void;
    onHover: () => void;
  },
  ref: React.ForwardedRef<HTMLLIElement>
) {
  const hasBadge = typeof badgeCount === "number" && badgeCount > 0;

  return (
    <li
      ref={ref}
      role="tab"
      aria-selected={active}
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={onHover}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={cn(
        "relative z-10 cursor-pointer select-none",
        "rounded-full px-3 py-2 text-sm font-medium",
        "transition-colors",
        // text uses blend so it flips nicely over the cursor
        "text-[rgb(var(--fg))] mix-blend-difference"
      )}
    >
      <span className="inline-flex items-center gap-2">
        {icon ? <i className={cn(icon, "text-[13px]")} aria-hidden="true" /> : null}

        <span className="whitespace-nowrap">{label}</span>

        {hasBadge ? (
          <span
            className="ml-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold border"
            style={{
              background: "rgb(239 68 68)",
              color: "white",
              borderColor: "rgba(0,0,0,0.15)",
            }}
            aria-label={`${badgeCount} new items`}
            title={`${badgeCount} new`}
          >
            {badgeCount! > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </span>
    </li>
  );
});

function Cursor({ position }: { position: Position }) {
  return (
    <motion.li
      aria-hidden="true"
      animate={{ ...position }}
      transition={{ type: "spring", stiffness: 500, damping: 45 }}
      className="absolute z-0 h-[38px] rounded-full"
      style={{
        background: "rgb(var(--fg))",
      }}
    />
  );
}