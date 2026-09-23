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
    ],
  },
  {
    title: "Developers",
    links: [
      ["For developers", "/?for=developers"],
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
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
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
          Mastodon.
        </p>
      </div>
    </footer>
  );
}
