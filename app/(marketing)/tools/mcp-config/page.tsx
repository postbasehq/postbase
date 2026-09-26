import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { McpClientConfig } from "@/components/McpClientConfig";
import { pageMeta } from "@/lib/site";
import { CLIENTS, MCP_URL } from "@/lib/seo/clients";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { Eyebrow, LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

const TITLE = "MCP config generator for Claude, Cursor, VS Code and more";
const DESCRIPTION =
  "Get the exact MCP setup for Claude, Claude Code, Cursor, VS Code, Windsurf and Gemini CLI: a hosted URL with sign-in, or an npx config with an API key. Copy, paste, done.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "MCP config generator" }];

const FAQS: [string, string][] = [
  [
    "Which should I pick, sign-in or API key?",
    "Sign-in, if your AI tool supports remote servers, which all of the ones listed here do. There's no secret to store, and you can revoke access from the Postbase Developers page. Use an API key for scripts, CI, or tools that only run local servers.",
  ],
  [
    "Where does the config file go?",
    "Each client is different, so the generator shows the file path or the command for the one you pick. Claude on the web and desktop don't use a file for remote servers: you add the URL under Settings → Connectors.",
  ],
  [
    "Is it safe to put an API key in a config file?",
    "It's stored on your computer in plain text, so don't commit it to git or share the file. Give each tool its own key so you can revoke one without breaking the others.",
  ],
  [
    "What can an AI tool do once it's connected?",
    "List your connected channels, create a draft or scheduled post or thread, list the queue and cancel a scheduled post. It can't delete posts or change your account.",
  ],
];

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, ...pageMeta("/tools/mcp-config") };

export default function McpConfigPage() {
  return (
    <>
      <SeoJsonLd path="/tools/mcp-config" name={TITLE} description={DESCRIPTION} trail={TRAIL} faqs={FAQS} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          eyebrow={<Eyebrow>Free tool</Eyebrow>}
          h1={["MCP config", "generator"]}
          sub="Pick your AI tool and get the exact setup for the Postbase MCP server. It's the same generator as the Developers page in the app."
          cta={{ label: "Get a free trial", href: "/login" }}
          secondary={{ label: "Read the docs", href: "https://docs.postbase.so/mcp/connect" }}
        />

        <section className={`${wrap} pt-12`}>
          <div className="mx-auto max-w-[900px]">
            <McpClientConfig apiKey={null} mcpUrl={MCP_URL} />
            <p className="mt-3 text-center text-[13px] text-muted">
              The API key option shows a placeholder. Create a real key on the Developers page after you sign up.
            </p>
          </div>
        </section>

        <section className={section}>
          <SectionHead title="Step-by-step guides" sub="Setup, example prompts and troubleshooting for each tool." />
          <LinkCards
            items={CLIENTS.map((c) => ({ href: `/ai/${c.slug}`, title: c.eyebrow, client: c.logo, body: c.setup.instruction }))}
          />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={FAQS} />
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            developers
            body="Connect your agent in a minute. It drafts and schedules, and you see every post in your calendar."
            secondary={{ label: "Read the docs", href: "https://docs.postbase.so/mcp/connect" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
