import Link from "next/link";
import { formatDate, type Category, type PostMeta } from "@/lib/blog";
import { card } from "@/components/marketing/ui";

/** Solid brand colour per category, used for the card's label. */
export const CATEGORY_TONE: Record<Category, { bg: string; fg: string }> = {
  "AI agents": { bg: "#2b59d9", fg: "#fff" },
  Developers: { bg: "#d14a3e", fg: "#fff" },
  Guides: { bg: "#e3a72c", fg: "#202124" },
};

export function CategoryPill({ category }: { category: Category }) {
  const t = CATEGORY_TONE[category];
  return (
    <span
      className="inline-block self-start rounded-full px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ backgroundColor: t.bg, color: t.fg }}
    >
      {category}
    </span>
  );
}

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className={`${card} group flex h-full flex-col p-7 transition-colors hover:border-ink`}>
      <CategoryPill category={post.category} />
      <h3 className="mt-5 font-display text-[22px] font-semibold leading-[1.2] tracking-[-0.015em] text-ink text-balance group-hover:text-blue-ink">
        {post.title}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{post.description}</p>
      <p className="mt-auto pt-6 text-[13px] font-medium text-muted">
        {formatDate(post.date)} · {post.minutes} min read
      </p>
    </Link>
  );
}
