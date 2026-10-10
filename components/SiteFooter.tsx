import Link from "next/link";
import { Logo } from "./Logo";
import { BrandTile } from "./BrandTile";
import { ClientLogo } from "./ClientLogo";
import { CookieSettingsLink } from "./Analytics";
import { FooterWordmark } from "./FooterWordmark";

/** Optional icon before a link: a network tile ("brand:x"), an AI tool logo ("client:claude") or an arrow. */
type Icon = `brand:${string}` | `client:${string}` | "arrow";

const COLUMNS: { title: string; links: [string, string, Icon?][] }[] = [
  {
    title: "Product",
    links: [
      ["Features", "/#features"],
      ["Channels", "/#channels"],
      ["Pricing", "/pricing"],
      ["FAQ", "/#faq"],
      ["For creators", "/for/creators"],
      ["For founders", "/for/founders"],
      ["For agencies", "/for/agencies"],
      ["For small businesses", "/for/small-businesses"],
      ["Blog", "/blog"],
      ["Changelog", "/changelog"],
      ["Free tools", "/tools"],
    ],
  },
  {
    title: "Integrations",
    links: [
      ["X (Twitter)", "/integrations/x", "brand:x"],
      ["LinkedIn", "/integrations/linkedin", "brand:linkedin"],
      ["Bluesky", "/integrations/bluesky", "brand:bluesky"],
      ["Mastodon", "/integrations/mastodon", "brand:mastodon"],
      ["TikTok", "/integrations/tiktok", "brand:tiktok"],
      ["YouTube", "/integrations/youtube", "brand:youtube"],
      ["All integrations", "/integrations", "arrow"],
    ],
  },
  {
    title: "AI tools",
    links: [
      ["Claude", "/ai/claude", "client:claude"],
      ["ChatGPT", "/ai/chatgpt", "client:chatgpt"],
      ["Claude Code", "/ai/claude-code", "client:claude-code"],
      ["Cursor", "/ai/cursor", "client:cursor"],
      ["VS Code", "/ai/vscode", "client:vscode"],
      ["Windsurf", "/ai/windsurf", "client:windsurf"],
      ["Gemini CLI", "/ai/gemini-cli", "client:gemini"],
      ["All AI tools", "/ai", "arrow"],
    ],
  },
  {
    title: "Compare",
    links: [
      ["Buffer alternative", "/alternatives/buffer"],
      ["Hootsuite alternative", "/alternatives/hootsuite"],
      ["Typefully alternative", "/alternatives/typefully"],
      ["Hypefury alternative", "/alternatives/hypefury"],
      ["Later alternative", "/alternatives/later"],
      ["Postiz alternative", "/alternatives/postiz"],
      ["All comparisons", "/alternatives", "arrow"],
    ],
  },
  {
    title: "Developers",
    links: [
      ["For developers", "/developers"],
      ["MCP server", "/mcp"],
      ["Docs", "https://docs.postbase.so"],
      ["GitHub", "https://github.com/postbasehq"],
    ],
  },
  {
    title: "Company",
    links: [
      ["X", "https://x.com/postbasehq"],
      ["Contact", "/contact"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="pb-10 pt-14 text-[14px]">
      <div className="mx-auto max-w-[1180px] px-5 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_repeat(6,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-[32ch] text-muted">
              The open-source distribution and growth platform. Grow on every network without living on social media.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <div className="font-display text-[14px] font-semibold text-ink">{c.title}</div>
              <ul className="mt-3 flex flex-col gap-2.5">
                {c.links.map(([label, href, icon]) => {
                  const cls = `text-muted transition-colors hover:text-ink ${icon ? "inline-flex items-center gap-2.5 whitespace-nowrap" : ""}`;
                  const inner = (
                    <>
                      {icon ? <LinkIcon icon={icon} /> : null}
                      {label}
                    </>
                  );
                  return (
                    <li key={label}>
                      {href.startsWith("/") && !href.includes("#") && !href.includes("?") ? (
                        <Link href={href} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <a href={href} className={cls}>
                          {inner}
                        </a>
                      )}
                    </li>
                  );
                })}
                {/* Consent must stay as easy to change as it was to give, so it lives with the legal links. */}
                {c.title === "Company" ? (
                  <li>
                    <CookieSettingsLink className="text-left text-muted transition-colors hover:text-ink" />
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
        {/* The wordmark hangs from this rule, its letters cut flat against it. */}
        <div className="mt-14 border-t border-line">
          <FooterWordmark />
        </div>
        <p className="mt-10 text-[12px] leading-relaxed text-muted">
          © {new Date().getFullYear()} Berkway Group Limited, trading as Postbase. Registered in England and Wales. Not
          affiliated with the networks or AI tools named on this site.
        </p>
      </div>
    </footer>
  );
}

function LinkIcon({ icon }: { icon: Icon }) {
  if (icon === "arrow") {
    return (
      <span className="grid size-[18px] place-items-center" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    );
  }
  const [kind, id] = icon.split(":");
  return kind === "brand" ? <BrandTile platform={id} size={18} radius={5} /> : <ClientLogo id={id} size={18} />;
}
