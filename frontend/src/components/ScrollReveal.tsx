"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function ScrollReveal({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect(); // animate once
          }
        }
      },
      { threshold: 0.18 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-1000 ease-out will-change-transform",
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.98]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
