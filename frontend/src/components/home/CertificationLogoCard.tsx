import Image from "next/image";
import Link from "next/link";
import HomeCard from "./HomeCard";

type CertificationLogoCardProps = {
  title: string;
  description?: string;
  href: string;
  logoSrc: string;
  logoAlt: string;
};

export default function CertificationLogoCard({
  title,
  description,
  href,
  logoSrc,
  logoAlt,
}: CertificationLogoCardProps) {
  return (
    <Link href={href} target="_blank" rel="noreferrer" className="block">
      <HomeCard className="p-4">
        <div className="text-sm font-semibold">{title}</div>

        <div
          className="mt-3 flex min-h-[96px] items-center justify-center overflow-hidden rounded-xl border"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--bg))" }}
        >
          <div className="relative h-16 w-full max-w-[180px]">
            <Image
              src={logoSrc}
              alt={logoAlt}
              fill
              className="object-contain"
            />
          </div>
        </div>

        {description ? (
          <div
            className="mt-3 text-sm leading-6"
            style={{ color: "rgb(var(--muted))" }}
          >
            {description}
          </div>
        ) : null}
      </HomeCard>
    </Link>
  );
}
