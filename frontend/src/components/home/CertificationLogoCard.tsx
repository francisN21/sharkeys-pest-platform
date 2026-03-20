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
    <MarketingCard className="group p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "rgb(234 179 8)" }}
        />
        <div className="text-sm font-semibold">{title}</div>
      </div>

      <div className="mt-3 flex justify-center">
        <div
          className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl border transition-all duration-300 group-hover:scale-[1.03]"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgba(255,255,255,0.04)",
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