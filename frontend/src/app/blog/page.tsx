import Navbar from "../../components/Navbar";
import PageTracker from "../../components/PageTracker";
import BlogCard from "../../../src/app/blog/BlogCard";
import SiteFooter from "@/src/components/home/SiteFooter";

const POSTS = [
  {
    title: "Common Pests in Benicia, CA Homes",
    desc: "Learn which pests homeowners in Benicia commonly deal with and when it may be time to call a professional.",
    href: "/blog/common-pests-benicia-ca",
    date: null,
    imageUrl: "/pest-infested-house.png",
  },
  {
    title: "How to Prevent Ant Infestations in the Bay Area",
    desc: "Simple prevention steps that help reduce ant activity around your home and property.",
    href: "/blog/how-to-prevent-ants-in-the-bay-area",
    date: null,
    imageUrl: "/ant-infested-home.png",
  },
  {
    title: "What Attracts Rats to Homes?",
    desc: "Understand the most common causes of rodent activity and how to reduce the risk of infestation.",
    href: "/blog/what-attracts-rats-to-homes",
    date: null,
    imageUrl: "/rat-infested-home.png",
  },
];

function BlogHeroImage({
  imageUrl,
}: {
  imageUrl?: string | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border h-[220px] md:h-full md:min-h-[260px]"
      style={{
        borderColor: "rgb(var(--border))",
        background: imageUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.20), rgba(0,0,0,0.55)), url(${imageUrl}) center / cover no-repeat`
          : "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.12) 35%, rgba(15,23,42,0.95) 100%)",
      }}
    >
      {!imageUrl && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 32%)",
            }}
          />

          <div className="relative flex h-full flex-col justify-end p-6">
            <div className="text-lg font-semibold text-white">
              Blog Hero Image Placeholder
            </div>
            <p className="mt-2 text-sm text-white/80">
              Suggested image: technician inspecting a home exterior, pest
              control truck, or close-up of common household pests.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

const LINKEDIN_SOFTWARE_BY_HREF = "https://www.linkedin.com/in/franciscorones/";

export default function BlogPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-10">
          <PageTracker
            items={[
              { label: "Home", href: "/" },
              { label: "Blog" },
            ]}
          />

          {/* Blog Header Wrapper */}
          <header
            className="overflow-hidden rounded-[2rem] border"
            style={{
              borderColor: "rgb(var(--border))",
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(79,70,229,0.12) 40%, rgb(var(--card)) 100%)",
            }}
          >
            <div className="grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8 lg:p-10">
              <div className="flex flex-col justify-center">
                <div
                  className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(59,130,246,0.08)",
                    color: "rgb(var(--fg))",
                  }}
                >
                  Pest Control Insights
                </div>

                <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Welcome to Our Blog
                </h1>

                <p
                  className="mt-4 max-w-2xl text-base leading-7 sm:text-lg"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Tips, prevention guides, and helpful information from pest
                  control professionals serving the Bay Area.
                </p>

                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <span
                    className="rounded-full border px-3 py-1"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                    }}
                  >
                    Homeowner Tips
                  </span>

                  <span
                    className="rounded-full border px-3 py-1"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                    }}
                  >
                    Pest Prevention
                  </span>

                  <span
                    className="rounded-full border px-3 py-1"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                    }}
                  >
                    Bay Area Guides
                  </span>
                </div>
              </div>

              <BlogHeroImage imageUrl="/main-hero-blog.png" />
            </div>
          </header>

          {/* Blog Cards */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {POSTS.map((post) => (
              <BlogCard
                key={post.href}
                title={post.title}
                desc={post.desc}
                href={post.href}
                imageUrl={post.imageUrl}
              />
            ))}
          </div>
        </div>
      </section>
      
      <section className="md:min-h-screen md:flex md:flex-col md:justify-end">
        <SiteFooter softwareByHref={LINKEDIN_SOFTWARE_BY_HREF} />
      </section>
    </main>
  );
}