import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CATEGORIES, listPosts } from "@/lib/blog";
import { CtaBand, Underlined, wrap } from "@/components/marketing/ui";
import { Breadcrumbs } from "@/components/marketing/ui";
import { SectionHead, section } from "@/components/marketing/seo/sections";
import { PostCard } from "@/components/marketing/blog/PostCard";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

const DESCRIPTION =
  "Guides to scheduling posts, connecting AI agents over MCP, and posting through the X, LinkedIn, Bluesky, TikTok and YouTube APIs.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Blog" }];

export const metadata: Metadata = { title: "Blog: scheduling, AI agents and social APIs", description: DESCRIPTION, ...pageMeta("/blog", { ownImage: true }) };

export default function BlogIndex() {
  const posts = listPosts();
  return (
    <>
      <SeoJsonLd path="/blog" name="Postbase blog" description={DESCRIPTION} trail={TRAIL} />
      <SiteNav />
      <main>
        <section className={`${wrap} pt-10 text-center md:pt-14`}>
          <Breadcrumbs trail={TRAIL} />
          <h1 className="mx-auto mt-8 max-w-[16ch] font-display text-[clamp(40px,6.2vw,76px)] font-semibold leading-[1.04] tracking-[-0.04em] text-ink text-balance">
            Posting, agents and <Underlined>APIs</Underlined>
          </h1>
          <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-relaxed text-muted text-balance md:text-[19px]">{DESCRIPTION}</p>
        </section>

        {CATEGORIES.map((cat) => {
          const inCat = posts.filter((p) => p.category === cat);
          if (!inCat.length) return null;
          return (
            <section key={cat} className={section}>
              <SectionHead title={cat} />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inCat.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            </section>
          );
        })}

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="Schedule to every network from one calendar, or let your AI agent do it. Every plan includes the MCP server and the API."
            secondary={{ label: "See pricing", href: "/pricing" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
