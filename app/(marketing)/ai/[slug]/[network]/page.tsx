import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";
import { pageMeta } from "@/lib/site";
import { ALL_COMBOS, COMBO_CLIENTS, COMBO_NETWORKS, getCombo } from "@/lib/seo/combos";
import { CLIENTS } from "@/lib/seo/clients";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { CtaBand, FaqList, card, wrap } from "@/components/marketing/ui";
import { CodeBlock, Eyebrow, Facts, LinkCards, Prompts, SectionHead, SeoHero, Steps, section } from "@/components/marketing/seo/sections";
import { ClientSetupDemo } from "@/components/marketing/seo/demos";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_COMBOS.map((c) => ({ slug: c.client, network: c.network }));
}

type Params = Promise<{ slug: string; network: string }>;

const titleFor = (client: string, network: string, what: string) =>
  `Post to ${network} from ${client}: schedule ${what} with MCP`;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, network } = await params;
  const c = getCombo(slug, network);
  if (!c) return {};
  return {
    title: { absolute: `${titleFor(c.client.name, c.network.name, c.notes.what)} · Postbase` },
    description: `Connect ${c.client.name} to your ${c.network.name} account with the Postbase MCP server, then ask it to write and schedule ${c.notes.what}. Setup takes a minute, with no API key.`,
    ...pageMeta(`/ai/${slug}/${network}`),
  };
}

export default async function ComboPage({ params }: { params: Params }) {
  const { slug, network } = await params;
  const combo = getCombo(slug, network);
  if (!combo) notFound();
  const { client, network: n, notes, prompts } = combo;
  const path = `/ai/${slug}/${network}`;
  const trail = [
    { label: "Home", href: "/" },
    { label: "AI tools", href: "/ai" },
    { label: client.name, href: `/ai/${client.slug}` },
    { label: n.name },
  ];
  const title = titleFor(client.name, n.name, notes.what);
  const description = `Connect ${client.name} to ${n.name} with the Postbase MCP server and schedule ${notes.what} from ${
    client.kind === "chat" ? "a chat" : client.kind === "terminal" ? "your terminal" : "your editor"
  }.`;

  const steps = [
    {
      title: `Connect ${n.name} to Postbase`,
      body: n.steps[0]?.body ?? `Add your ${n.name} account on the Channels page in Postbase.`,
    },
    client.steps[0],
    { title: `Ask for ${notes.what}`, body: `Tell ${client.name} what to post on ${n.name} and when. Everything it schedules shows up in your Postbase calendar.` },
  ];

  const faqs: [string, string][] = [
    ...notes.faqs,
    [
      `Does ${client.name} need my ${n.name} password?`,
      `No. You connect ${n.name} to Postbase once, and ${client.name} signs in to Postbase, not to ${n.name}. You can revoke ${client.name}'s access from the Developers page at any time.`,
    ],
    [
      `Can ${client.name} delete my ${n.name} posts?`,
      `No. It can list channels, create drafts and scheduled posts, list the queue and cancel a scheduled post. There's no tool for deleting anything.`,
    ],
  ];

  return (
    <>
      <SeoJsonLd path={path} name={title} description={description} trail={trail} faqs={faqs} />
      <SiteNav />
      <main>
        <SeoHero
          trail={trail}
          eyebrow={
            <Eyebrow
              icon={
                <span className="flex items-center gap-1">
                  <ClientLogo id={client.logo} size={22} />
                  <BrandTile platform={n.id} size={22} radius={6} />
                </span>
              }
            >
              {client.name} + {n.name}
            </Eyebrow>
          }
          h1={[`Post to ${n.name} from`, client.name]}
          sub={description + " No API key, and every post lands on a calendar you can check."}
          cta={{ label: "Connect in a minute", href: "/login" }}
          secondary={{ label: `All ${client.name} setup`, href: `/ai/${client.slug}` }}
          frame={`Connect ${client.name} from the Developers page`}
        >
          <ClientSetupDemo client={{ logo: client.logo, name: client.name, setup: client.setup }} />
        </SeoHero>

        <section className={section}>
          <SectionHead title="Set up in three steps" />
          <Steps items={steps} />
          <div className="mt-8">
            <CodeBlock language={client.setup.language} code={client.setup.code} caption={client.setup.instruction} />
          </div>
        </section>

        <section className={section}>
          <SectionHead title={`What to ask ${client.name}`} sub={`A few ${n.name} requests that work well.`} />
          <Prompts items={prompts} />
        </section>

        <section className={section}>
          <SectionHead title={`How ${client.name}'s posts work on ${n.name}`} />
          <Facts items={notes.notes} />
          <div className={`${card} mt-4 p-7`}>
            <h3 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">Tips for better {n.name} posts</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {notes.tips.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={faqs} />
        </section>

        <section className={section}>
          <SectionHead title="Related" />
          <LinkCards
            items={[
              ...COMBO_NETWORKS.filter((x) => x !== network).map((x) => {
                const o = LIVE_NETWORKS.find((l) => l.slug === x)!;
                return { href: `/ai/${slug}/${x}`, title: `${client.name} + ${o.name}`, brand: o.id, body: `Post to ${o.name} from ${client.name}.` };
              }),
              ...COMBO_CLIENTS.filter((x) => x !== slug).map((x) => {
                const o = CLIENTS.find((l) => l.slug === x)!;
                return { href: `/ai/${x}/${network}`, title: `${o.name} + ${n.name}`, client: o.logo, body: `Post to ${n.name} from ${o.name}.` };
              }),
              { href: `/integrations/${n.slug}`, title: n.eyebrow, brand: n.id, body: n.blurb },
            ]}
          />
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            developers
            body={`Connect ${client.name} in a minute. It writes and schedules your ${n.name} posts, and you see every one in your calendar.`}
            secondary={{ label: "Read the docs", href: "https://docs.postbase.so/mcp/connect" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
