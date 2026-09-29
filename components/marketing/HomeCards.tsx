import Link from "next/link";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";
import { LinkCards } from "@/components/marketing/seo/sections";
import { Arrow } from "@/components/marketing/ui";

// Rendered on the server and handed to the (client) Landing page, so the SEO
// page data never ships to the browser.

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-8 flex justify-center">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 font-display text-[14px] font-semibold text-ink shadow-sm transition-colors hover:border-ink"
      >
        {label}
        <Arrow />
      </Link>
    </div>
  );
}

export function NetworkCards() {
  return (
    <>
      <LinkCards items={LIVE_NETWORKS.map((n) => ({ href: `/integrations/${n.slug}`, title: n.name, brand: n.id, body: n.blurb }))} />
      <SeeAll href="/integrations" label="All integrations" />
    </>
  );
}

export function AiToolCards() {
  return (
    <>
      <LinkCards items={CLIENTS.map((c) => ({ href: `/ai/${c.slug}`, title: c.name, client: c.logo, body: c.blurb }))} />
      <SeeAll href="/ai" label="How the MCP server works" />
    </>
  );
}
