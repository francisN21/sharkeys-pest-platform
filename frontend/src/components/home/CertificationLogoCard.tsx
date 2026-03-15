import Image from "next/image";
import Link from "next/link";
import MarketingCard from "../ui/marketing-card";

type CertificationLogoCardProps = {
  title: string;
  imageSrc: string;
  imageAlt: string;
  href?: string;
};

export default function CertificationLogoCard({
  title,
  imageSrc,
  imageAlt,
  href,
}: CertificationLogoCardProps) {
  const content = (
    <MarketingCard className="p-4">
      <div className="text-sm font-semibold">{title}</div>

      <div
        className="mt-3 flex min-h-[96px] items-center justify-center overflow-hidden rounded-xl border"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--bg))",
        }}
      >
        <div className="relative h-16 w-full max-w-[180px]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-contain"
          />
        </div>
      </div>
    </MarketingCard>
  );

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}