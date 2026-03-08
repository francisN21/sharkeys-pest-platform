"use client";

import { MapPin } from "lucide-react";
import { InfiniteSlider } from "../../components/ui/infinite-slider";

const DEFAULT_AREAS = [
  "Benicia",
  "Vallejo",
  "Fairfield",
  "Concord",
  "Martinez",
  "San Francisco",
  "Daly City",
  "San Ramon",
  "Oakland",
];

type ServiceAreaStripProps = {
  title?: string;
  areas?: string[];
  className?: string;
};

export default function ServiceAreaStrip({
  title = "Servicing",
  areas = DEFAULT_AREAS,
  className,
}: ServiceAreaStripProps) {
  return (
    <section className={className}>
      <div
        className="rounded-3xl border px-4 py-4 md:px-6"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--card))",
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="shrink-0 md:w-[180px]">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4" />
              <span>{title}:</span>
            </div>
          </div>

          <div className="relative min-w-0 flex-1 overflow-hidden">
            <InfiniteSlider gap={40} duration={22} durationOnHover={40}>
              {areas.map((area) => (
                <div
                  key={area}
                  className="inline-flex items-center gap-3 whitespace-nowrap text-sm font-medium"
                  style={{ color: "rgb(var(--fg))" }}
                >
                  <span>{area}</span>
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: "rgb(var(--muted))" }}
                  />
                </div>
              ))}
            </InfiniteSlider>

            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-10"
              style={{
                background:
                  "linear-gradient(to right, rgb(var(--card)), rgba(255,255,255,0))",
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-10"
              style={{
                background:
                  "linear-gradient(to left, rgb(var(--card)), rgba(255,255,255,0))",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}