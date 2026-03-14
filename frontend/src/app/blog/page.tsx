import Navbar from "../../components/Navbar";
import PageTracker from "../../components/PageTracker";
import BlogCard from "../../../src/app/blog/BlogCard";

const POSTS = [
  {
    title: "Common Pests in Benicia, CA Homes",
    desc: "Learn which pests homeowners in Benicia commonly deal with and when it may be time to call a professional.",
    href: "/blog/common-pests-benicia-ca",
    date: null,
    imageUrl: null, // future hook for real blog image
  },
  {
    title: "How to Prevent Ant Infestations in the Bay Area",
    desc: "Simple prevention steps that help reduce ant activity around your home and property.",
    href: "/blog/how-to-prevent-ants-in-the-bay-area",
    date: null,
    imageUrl: null, // future hook for real blog image
  },
  {
    title: "What Attracts Rats to Homes?",
    desc: "Understand the most common causes of rodent activity and how to reduce the risk of infestation.",
    href: "/blog/what-attracts-rats-to-homes",
    date: null,
    imageUrl: null, // future hook for real blog image
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <PageTracker
            items={[
              { label: "Home", href: "/" },
              { label: "Blog" },
            ]}
          />

          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Latest from Our Blog
            </h1>
            <p
              className="mx-auto mt-4 max-w-2xl text-sm sm:text-base"
              style={{ color: "rgb(var(--muted))" }}
            >
              Tips, guides, and updates from your pest control experts.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {POSTS.map((post) => (
              <BlogCard
                key={post.href}
                title={post.title}
                desc={post.desc}
                href={post.href}
                // date={post.date} - will render once we really have it
                imageUrl={post.imageUrl}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}