import React from "react";

type HomeCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function HomeCard({ children, className = "" }: HomeCardProps) {
  return (
    <div
      className={`rounded-[1.5rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${className}`}
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--card))",
      }}
    >
      {children}
    </div>
  );
}
