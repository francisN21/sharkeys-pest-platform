"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export type SlideTabItem<K extends string> = {
  key: K;
  label: string;
  icon?: string;
  badgeCount?: number;
};

type Position = {
  left: number;
  width: number;
  opacity: number;
};

type SlideTabsProps<K extends string> = {
  tabs: Array<SlideTabItem<K>>;
  value: K;
  onChange: (key: K) => void;
  className?: string;
};

type TabButtonProps = {
  active: boolean;
  icon?: string;
  label: string;
  badgeCount?: number;
  onClick: () => void;
  onHover?: () => void;
};

export function SlideTabs<K extends string>({
  tabs,
  value,
  onChange,
  className,
}: SlideTabsProps<K>) {
  const selectedIndex = useMemo(
    () => Math.max(0, tabs.findIndex((t) => t.key === value)),
    [tabs, value]
  );

  const [position, setPosition] = useState<Position>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const containerRef = useRef<HTMLUListElement | null>(null);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  const syncToIndex = (i: number) => {
    const el = refs.current[i];
    const container = containerRef.current;
    if (!el || !container) return;

    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setPosition({
      left: elRect.left - containerRect.left,
      width: elRect.width,
      opacity: 1,
    });
  };

  useLayoutEffect(() => {
    syncToIndex(selectedIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, tabs.length]);

  useEffect(() => {
    const onResize = () => syncToIndex(selectedIndex);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, tabs.length]);

  const mobilePrimaryTabs = useMemo(() => {
    if (tabs.length <= 2) return tabs;

    const first = tabs[0];
    const active = tabs.find((t) => t.key === value);

    if (!active) return tabs.slice(0, 2);
    if (active.key === first.key) return [first, tabs[1]].filter(Boolean);

    return [first, active];
  }, [tabs, value]);

  const mobileOverflowTabs = useMemo(() => {
    const visibleKeys = new Set(mobilePrimaryTabs.map((t) => t.key));
    return tabs.filter((t) => !visibleKeys.has(t.key));
  }, [tabs, mobilePrimaryTabs]);

  const mobileOverflowActive =
    mobileOverflowTabs.find((t) => t.key === value) ?? null;

  return (
    <>
      {/* Mobile: 2 visible tabs + dropdown */}
      <div className={cn("md:hidden", className)}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border p-1",
            "bg-[rgb(var(--card))] border-[rgb(var(--border))]"
          )}
          aria-label="Account navigation"
          role="tablist"
        >
          {mobilePrimaryTabs.map((t) => (
            <div key={t.key} className="min-w-0 flex-1">
              <MobileTabButton
                active={t.key === value}
                icon={t.icon}
                label={t.label}
                badgeCount={t.badgeCount}
                onClick={() => onChange(t.key)}
              />
            </div>
          ))}

          {mobileOverflowTabs.length > 0 ? (
            <div className="shrink-0">
              <MobileOverflowMenu
                tabs={mobileOverflowTabs}
                value={value}
                activeOverflowLabel={mobileOverflowActive?.label}
                onChange={onChange}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Desktop: original slide tabs */}
      <ul
        ref={containerRef}
        onMouseLeave={() => syncToIndex(selectedIndex)}
        className={cn(
          "relative hidden w-fit max-w-full items-center gap-1 rounded-full border p-1 md:flex",
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
            <DesktopTab
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
    </>
  );
}

const DesktopTab = React.forwardRef<HTMLLIElement, TabButtonProps>(function DesktopTabInner(
  { active, icon, label, badgeCount, onClick, onHover },
  ref
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
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative z-10 cursor-pointer select-none rounded-full px-3 py-2 text-sm font-medium transition-colors",
        "text-[rgb(var(--fg))] mix-blend-difference"
      )}
    >
      <span className="inline-flex items-center gap-2">
        {icon ? <i className={cn(icon, "text-[13px]")} aria-hidden="true" /> : null}

        <span className="whitespace-nowrap">{label}</span>

        {hasBadge ? (
          <span
            className="ml-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border px-1 text-[11px] font-semibold"
            style={{
              background: "rgb(239 68 68)",
              color: "white",
              borderColor: "rgba(0,0,0,0.15)",
            }}
            aria-label={`${badgeCount} new items`}
            title={`${badgeCount} new`}
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </span>
    </li>
  );
});

function MobileTabButton({ active, icon, label, badgeCount, onClick }: TabButtonProps) {
  const hasBadge = typeof badgeCount === "number" && badgeCount > 0;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[rgb(var(--fg))] text-[rgb(var(--bg))]"
          : "bg-transparent text-[rgb(var(--fg))]"
      )}
    >
      {icon ? <i className={cn(icon, "shrink-0 text-[13px]")} aria-hidden="true" /> : null}
      <span className="truncate whitespace-nowrap">{label}</span>

      {hasBadge ? (
        <span
          className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full border px-1 text-[11px] font-semibold"
          style={{
            background: "rgb(239 68 68)",
            color: "white",
            borderColor: "rgba(0,0,0,0.15)",
          }}
          aria-label={`${badgeCount} new items`}
          title={`${badgeCount} new`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </button>
  );
}

function MobileOverflowMenu<K extends string>({
  tabs,
  value,
  activeOverflowLabel,
  onChange,
}: {
  tabs: Array<SlideTabItem<K>>;
  value: K;
  activeOverflowLabel?: string;
  onChange: (key: K) => void;
}) {
  return (
    <div className="relative">
      <label className="sr-only" htmlFor="mobile-tab-overflow">
        More tabs
      </label>

      <div className="relative">
        <select
          id="mobile-tab-overflow"
          value={tabs.some((t) => t.key === value) ? value : ""}
          onChange={(e) => {
            const next = e.target.value as K;
            if (next) onChange(next);
          }}
          className={cn(
            "appearance-none rounded-full border px-3 py-2 pr-9 text-sm font-medium outline-none transition-colors",
            "bg-[rgb(var(--card))] text-[rgb(var(--fg))] border-[rgb(var(--border))]"
          )}
          aria-label="More tabs"
        >
          <option value="">
            {activeOverflowLabel ? activeOverflowLabel : "More"}
          </option>
          {tabs.map((t) => (
            <option key={t.key} value={t.key}>
              {typeof t.badgeCount === "number" && t.badgeCount > 0
                ? `${t.label} (${t.badgeCount > 99 ? "99+" : t.badgeCount})`
                : t.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function Cursor({ position }: { position: Position }) {
  return (
    <motion.li
      aria-hidden="true"
      animate={{
        left: position.left,
        width: position.width,
        opacity: position.opacity,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 45 }}
      className="pointer-events-none absolute z-0 h-[38px] rounded-full"
      style={{
        background: "rgb(var(--fg))",
      }}
    />
  );
}