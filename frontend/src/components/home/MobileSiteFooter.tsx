import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "Booking", href: "/sharkys-pest-control-booking" },
  { label: "Service Area", href: "/service-area" },
  { label: "Blog", href: "/blog" },
];

type MobileSiteFooterProps = {
  softwareByHref: string;
};

export default function MobileSiteFooter({
  softwareByHref,
}: MobileSiteFooterProps) {
  return (
    <footer
      className="mt-12 border-t md:hidden"
      style={{
        borderColor: "rgb(var(--border))",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-white/90">

        {/* CENTERED LINKS */}
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3 justify-items-center">
          {FOOTER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="w-full rounded-xl px-3 py-2 transition hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div
          className="mt-8 border-t pt-6"
          style={{ borderColor: "rgba(255,255,255,0.14)" }}
        >
          <p className="text-sm text-white/85">
            © 2025 Sharkys Pest Control. All rights reserved.
          </p>

          <p className="mt-4 text-sm text-white/85">
            Software solutions by{" "}
            <Link
              href={softwareByHref}
              target="_blank"
              rel="noreferrer"
              className="text-yellow-300 hover:underline"
            >
              Francisco Rones
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}