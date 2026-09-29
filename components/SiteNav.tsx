import Link from "next/link";
import { Logo } from "./Logo";
import { OpenSourceBanner } from "./OpenSourceBanner";
import { ThemeToggle } from "./ThemeToggle";
import { GitHubButton } from "./GitHubButton";
import { BrandTile } from "./BrandTile";
import { ClientLogo } from "./ClientLogo";
import { NETWORKS } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";

const BEFORE = [{ href: "/#features", label: "Features" }];
const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "https://docs.postbase.so", label: "Docs" },
];

/** Marketing nav. */
export function SiteNav() {
  return (
    <div className="sticky top-0 z-50">
      <OpenSourceBanner />
      <nav className="bg-ground/85 backdrop-blur-md backdrop-saturate-150">
        {/* Full width. On xl the links sit dead centre between logo and actions;
            on lg there isn't room for that, so they follow the logo. */}
        <div className="flex h-16 items-center gap-4 px-5 md:gap-6 md:px-8 xl:grid xl:grid-cols-[1fr_auto_1fr]">
          <Logo />
          <div className="hidden items-center gap-5 whitespace-nowrap lg:flex xl:gap-7">
            {BEFORE.map((l) => (
              <a key={l.label} href={l.href} className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
                {l.label}
              </a>
            ))}
            <IntegrationsMenu />
            <AiMenu />
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
                {l.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center justify-end gap-3.5">
            {/* Hidden on lg, where the nav links need the room. */}
            <span className="lg:max-xl:hidden">
              <GitHubButton />
            </span>
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden whitespace-nowrap rounded-full border border-line px-4 py-2 font-display text-[14px] font-semibold text-ink transition-colors hover:border-ink sm:inline"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full bg-blue px-4 py-2 font-display text-[14px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="sm:hidden">Try free</span>
              <span className="hidden sm:inline">Start free trial</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}

/**
 * A nav link with a dropdown panel. Opens on hover and on keyboard focus (CSS
 * only, so the nav stays a server component).
 */
function NavMenu({ label, href, width, children }: { label: string; href: string; width: number; children: React.ReactNode }) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className="flex items-center gap-1 text-[14px] font-medium text-muted transition-colors hover:text-ink group-hover:text-ink group-focus-within:text-ink"
        aria-haspopup="true"
      >
        {label}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Link>

      {/* pt-4 bridges the gap so the menu stays open while the pointer moves down */}
      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-4 opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div
          style={{ width }}
          className="rounded-[20px] border border-line bg-surface p-3 shadow-[0_24px_60px_-20px_rgba(16,24,40,0.35)]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function MenuFooter({ note, links }: { note: string; links: { href: string; label: string }[] }) {
  return (
    <div className="mt-2 flex items-center justify-between border-t border-line px-3 pb-1 pt-3 text-[13px]">
      <span className="text-muted">{note}</span>
      <span className="flex gap-4 font-semibold">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-blue-ink hover:underline">
            {l.label}
          </Link>
        ))}
      </span>
    </div>
  );
}

/** "Integrations": every network with its logo; ones not live yet show as coming soon. */
function IntegrationsMenu() {
  return (
    <NavMenu label="Integrations" href="/integrations" width={560}>
      <ul className="grid grid-cols-3 gap-1">
        {NETWORKS.map((n) => (
          <li key={n.slug}>
            {n.live ? (
              <Link
                href={`/integrations/${n.slug}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-2"
              >
                <BrandTile platform={n.id} size={26} radius={7} />
                {n.name}
              </Link>
            ) : (
              <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-muted">
                <span className="opacity-60">
                  <BrandTile platform={n.id} size={26} radius={7} />
                </span>
                {n.name}
                <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold">Soon</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <MenuFooter
        note="Plus Claude, Cursor and other AI tools over MCP."
        links={[
          { href: "/ai", label: "AI tools" },
          { href: "/integrations", label: "All integrations" },
        ]}
      />
    </NavMenu>
  );
}

const KIND = { chat: "Chat app", terminal: "Terminal", editor: "Editor" } as const;

/** "AI agents": every AI tool that can post through the Postbase MCP server. */
function AiMenu() {
  return (
    <NavMenu label="AI agents" href="/ai" width={480}>
      <ul className="grid grid-cols-2 gap-1">
        {CLIENTS.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/ai/${c.slug}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
            >
              <ClientLogo id={c.logo} size={26} />
              <span className="leading-tight">
                <span className="block text-[14px] font-medium text-ink">{c.name}</span>
                <span className="block text-[12px] text-muted">{KIND[c.kind]}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <MenuFooter
        note="Connect over MCP in a minute."
        links={[
          { href: "/tools/mcp-config", label: "Config generator" },
          { href: "/ai", label: "How it works" },
        ]}
      />
    </NavMenu>
  );
}
