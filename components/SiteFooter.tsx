import Link from "next/link";
import { Logo } from "./Logo";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["Features", "/#features"],
      ["Channels", "/#channels"],
      ["Pricing", "/#pricing"],
      ["FAQ", "/#faq"],
      ["Compare", "/alternatives"],
      ["Blog", "/blog"],
      ["Free tools", "/tools"],
    ],
  },
  {
    title: "Integrations",
    links: [
      ["X (Twitter)", "/integrations/x"],
      ["LinkedIn", "/integrations/linkedin"],
      ["Bluesky", "/integrations/bluesky"],
      ["Mastodon", "/integrations/mastodon"],
      ["TikTok", "/integrations/tiktok"],
      ["YouTube", "/integrations/youtube"],
      ["All integrations", "/integrations"],
    ],
  },
  {
    title: "AI tools",
    links: [
      ["Claude", "/ai/claude"],
      ["Claude Code", "/ai/claude-code"],
      ["Cursor", "/ai/cursor"],
      ["VS Code", "/ai/vscode"],
      ["Windsurf", "/ai/windsurf"],
      ["Gemini CLI", "/ai/gemini-cli"],
      ["All AI tools", "/ai"],
    ],
  },
  {
    title: "Developers",
    links: [
      ["For developers", "/developers"],
      ["MCP server", "https://docs.postbase.so/mcp/connect"],
      ["Docs", "https://docs.postbase.so"],
      ["GitHub", "https://github.com/postbasehq"],
    ],
  },
  {
    title: "Company",
    links: [
      ["X", "https://x.com/postbasehq"],
      ["Contact", "mailto:team@postbase.so"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="pb-10 pt-14 text-[14px]">
      <div className="mx-auto max-w-[1180px] px-5 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-[32ch] text-muted">
              The open-source social scheduler you can run from a dashboard or from your agent.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <div className="font-display text-[14px] font-semibold text-ink">{c.title}</div>
              <ul className="mt-3 flex flex-col gap-2.5">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("/") && !href.includes("#") && !href.includes("?") ? (
                      <Link href={href} className="text-muted transition-colors hover:text-ink">
                        {label}
                      </Link>
                    ) : (
                      <a href={href} className="text-muted transition-colors hover:text-ink">
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 text-[12px] leading-relaxed text-muted">
          © {new Date().getFullYear()} Berkway Group Limited, trading as Postbase. Registered in England and Wales.
          Postbase is a publishing tool and is not affiliated with X, LinkedIn, Instagram, TikTok, YouTube, Bluesky or
          Mastodon, or with the AI tools and other companies named on this site. All trademarks belong to their owners.
        </p>
      </div>
    </footer>
  );
}
