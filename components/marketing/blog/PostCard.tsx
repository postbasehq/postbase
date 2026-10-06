import Link from "next/link";
import { formatDate, type Category, type PostMeta } from "@/lib/blog";

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
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col rounded-[22px] border border-line bg-surface p-2 shadow-sm transition-colors hover:border-ink"
    >
      {/* Zone 1: the post's own cover (its share card), in an inset panel */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/blog/${post.slug}/cover.png`}
          alt=""
          loading="lazy"
          width={1200}
          height={630}
          className="aspect-[1200/630] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      {/* Zone 2: what it is */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        {/* The cover already carries the category label. */}
        <h3 className="font-display text-[22px] font-semibold leading-[1.2] tracking-[-0.015em] text-ink text-balance group-hover:text-blue-ink">
          {post.title}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{post.description}</p>
        <p className="mt-auto pt-6 text-[13px] font-medium text-muted">
          {formatDate(post.date)} · {post.minutes} min read
        </p>
      </div>
    </Link>
  );
}
