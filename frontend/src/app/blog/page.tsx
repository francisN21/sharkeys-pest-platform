import Link from "next/link";
import Navbar from "../../components/Navbar";
import PageTracker from "../../components/PageTracker";

const POSTS = [
  {
    title: "Common Pests in Benicia, CA Homes",
    desc: "Learn which pests homeowners in Benicia commonly deal with and when it may be time to call a professional.",
    href: "/blog/common-pests-benicia-ca",
  },
  {
    title: "How to Prevent Ant Infestations in the Bay Area",
    desc: "Simple prevention steps that help reduce ant activity around your home and property.",
    href: "/blog/how-to-prevent-ants-in-the-bay-area",
  },
  {
    title: "What Attracts Rats to Homes?",
    desc: "Understand the most common causes of rodent activity and how to reduce the risk of infestation.",
    href: "/blog/what-attracts-rats-to-homes",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-5xl space-y-8 px-4 py-16">
        <PageTracker
          items={[
            { label: "Home", href: "/" },
            { label: "Blog" },
          ]}
        />

        <div>
          <h1 className="text-3xl font-semibold">Pest Control Blog</h1>
          <p className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
            Helpful articles about pest prevention, common Bay Area pest issues, and service guidance.
          </p>
        </div>

        <div className="grid gap-4">
          {POSTS.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="rounded-2xl border p-6 hover:opacity-90"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <div className="text-lg font-semibold">{post.title}</div>
              <div className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
                {post.desc}
              </div>
              <div className="mt-4 text-sm font-semibold">Read article →</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}