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

      <div className="mt-3 flex justify-center">
        <div
          className="relative aspect-square w-full max-w-[180px] overflow-hidden rounded-2xl border p-3 transition-all duration-300 group-hover:scale-[1.02]"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--bg))",
          }}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-contain p-2"
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