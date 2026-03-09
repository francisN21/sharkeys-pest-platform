import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

type PageTrackerProps = {
  items: Crumb[];
  className?: string;
};

export default function PageTracker({ items, className }: PageTrackerProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
    >
      <ol
        className="flex flex-wrap items-center gap-2 text-sm italic"
        style={{ color: "rgb(var(--muted))" }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition hover:opacity-80 hover:underline"
                  style={{ color: "rgb(var(--fg))" }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  style={{ color: isLast ? "rgb(var(--muted))" : "rgb(var(--fg))" }}
                >
                  {item.label}
                </span>
              )}

              {!isLast ? (
                <span aria-hidden="true" style={{ color: "rgb(var(--muted))" }}>
                  &gt;
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}