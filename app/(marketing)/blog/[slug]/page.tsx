import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalToc } from "@/components/LegalToc";
import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";
import { SITE_NAME, SITE_URL, pageMeta } from "@/lib/site";
import { formatDate, getPost, listPosts } from "@/lib/blog";
import { Breadcrumbs, CtaBand, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, section } from "@/components/marketing/seo/sections";
import { relatedCards } from "@/lib/seo/related";
import { CategoryPill, PostCard } from "@/components/marketing/blog/PostCard";
import { Demo } from "@/components/marketing/blog/Demo";

export const dynamicParams = false;

export function generateStaticParams() {
  return listPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) return {};
  const meta = pageMeta(`/blog/${p.slug}`, { ownImage: true });
  return {
    title: { absolute: `${p.title} · Postbase` },
    description: p.description,
    ...meta,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: p.date, modifiedTime: p.updated ?? p.date },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const path = `/blog/${post.slug}`;
  const trail = [{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }];
  const related = relatedCards(post.related);
  const more = listPosts()
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3);

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${SITE_URL}${path}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        mainEntityOfPage: `${SITE_URL}${path}`,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@id": `${SITE_URL}/#organization` },
        image: `${SITE_URL}/opengraph-image`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.label, item: `${SITE_URL}${t.href ?? path}` })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output contains no HTML; escape "<" anyway so it can't close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }}
      />
      <SiteNav />
      <header className={`${wrap} pb-10 pt-10 md:pt-14`}>
        <div className="[&_ol]:justify-start">
          <Breadcrumbs trail={trail.slice(0, 2)} />
        </div>
        <div className="mt-8">
          <CategoryPill category={post.category} />
        </div>
        <h1 className="mt-5 max-w-[22ch] font-display text-[clamp(36px,5.2vw,60px)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink text-balance">
          {post.title}
        </h1>
        <p className="mt-5 max-w-[62ch] text-[18px] leading-relaxed text-muted">{post.description}</p>
        <p className="mt-5 text-[13.5px] font-medium text-muted">
          {post.updated ? `Updated ${formatDate(post.updated)}` : formatDate(post.date)} · {post.minutes} min read
        </p>
      </header>

      <div className={`${wrap} grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]`}>
        <aside className="hidden lg:block">{post.headings.length > 2 ? <LegalToc headings={post.headings} /> : null}</aside>
        <main className="min-w-0 rounded-[28px] border border-line bg-surface px-6 py-8 shadow-sm md:px-12 md:py-12">
          <article className="prose-blog max-w-[72ch]">
            {post.blocks.map((b, i) =>
              b.kind === "html" ? (
                <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
              ) : (
                <Demo key={i} name={b.name} props={b.props} />
              ),
            )}
          </article>
          <div className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-ground px-5 py-4">
            <span className="flex -space-x-1.5">
              {["x", "linkedin", "bluesky"].map((b) => (
                <span key={b} className="rounded-[7px] ring-2 ring-ground">
                  <BrandTile platform={b} size={26} radius={7} />
                </span>
              ))}
              <span className="rounded-[7px] ring-2 ring-ground">
                <ClientLogo id="claude" size={26} />
              </span>
            </span>
            <div>
              <div className="font-display text-[15px] font-semibold text-ink">Try Postbase free for 7 days</div>
              <p className="text-[13.5px] text-muted">Every network, the MCP server and the API on every plan.</p>
            </div>
            <Link href="/login" className="ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-[14px] font-semibold text-on-blue shadow-sm">
              Start free trial
            </Link>
          </div>
        </main>
      </div>

      {related.length ? (
        <section className={section}>
          <SectionHead title="Related" />
          <LinkCards items={related} />
        </section>
      ) : null}

      {more.length ? (
        <section className={section}>
          <SectionHead title="Keep reading" />
          <div className="grid gap-4 md:grid-cols-3">
            {more.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className={`${wrap} py-24 md:py-32`}>
        <CtaBand
          body="Schedule to every network from one calendar, or let your AI agent do it."
          secondary={{ label: "Read the docs", href: "https://docs.postbase.so" }}
        />
      </section>
      <SiteFooter />
    </>
  );
}
