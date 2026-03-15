type HomeSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export default function HomeSectionHeader({
  eyebrow,
  title,
  description,
}: HomeSectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <div
          className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgba(59,130,246,0.08)",
            color: "rgb(var(--fg))",
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>

      <p
        className="mt-3 text-base leading-7"
        style={{ color: "rgb(var(--muted))" }}
      >
        {description}
      </p>
    </div>
  );
}
