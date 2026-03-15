import React from "react";

type MarketingCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function MarketingCard({
  children,
  className = "",
}: MarketingCardProps) {
  return (
    <div
      className={`group rounded-[1.5rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${className}`}
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--card))",
      }}
    >
      {children}
    </div>
  );
}