import { postsLinkingTo } from "@/lib/blog";
import { SectionHead, section } from "@/components/marketing/seo/sections";
import { PostCard } from "@/components/marketing/blog/PostCard";

/** "From the blog": up to three posts that reference this page. Renders nothing if none do. */
export function RelatedPosts({ path, title = "From the blog" }: { path: string; title?: string }) {
  const posts = postsLinkingTo(path);
  if (!posts.length) return null;
  return (
    <section className={section}>
      <SectionHead title={title} />
      <div className={`grid gap-4 ${posts.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} />
        ))}
      </div>
    </section>
  );
}
