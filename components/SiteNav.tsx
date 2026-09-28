import Link from "next/link";
import { Logo } from "./Logo";
import { OpenSourceBanner } from "./OpenSourceBanner";
import { ThemeToggle } from "./ThemeToggle";
import { GitHubButton } from "./GitHubButton";
import { BrandTile } from "./BrandTile";
import { NETWORKS } from "@/lib/seo/networks";

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
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-4 px-5 md:gap-6 md:px-8">
          <div className="flex items-center gap-7">
            <Logo />
            <div className="hidden gap-6 lg:flex">
              {BEFORE.map((l) => (
                <a key={l.label} href={l.href} className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
                  {l.label}
                </a>
              ))}
              <IntegrationsMenu />
              {LINKS.map((l) => (
                <a key={l.label} href={l.href} className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center justify-end gap-3.5">
            <GitHubButton />
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-full border border-line px-4 py-2 font-display text-[14px] font-semibold text-ink transition-colors hover:border-ink sm:inline"
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
 * "Integrations" dropdown: every network with its logo, linking to its page.
 * Opens on hover and on keyboard focus (CSS only, so the nav stays a server
 * component). Networks that aren't live yet are listed as coming soon.
 */
function IntegrationsMenu() {
  return (
    <div className="group relative">
      <Link
        href="/integrations"
        className="flex items-center gap-1 text-[14px] font-medium text-muted transition-colors hover:text-ink group-hover:text-ink group-focus-within:text-ink"
        aria-haspopup="true"
      >
        Integrations
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
        <div className="w-[560px] rounded-[20px] border border-line bg-surface p-3 shadow-[0_24px_60px_-20px_rgba(16,24,40,0.35)]">
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
          <div className="mt-2 flex items-center justify-between border-t border-line px-3 pb-1 pt-3 text-[13px]">
            <span className="text-muted">Plus Claude, Cursor and other AI tools over MCP.</span>
            <span className="flex gap-4 font-semibold">
              <Link href="/ai" className="text-blue-ink hover:underline">
                AI tools
              </Link>
              <Link href="/integrations" className="text-blue-ink hover:underline">
                All integrations
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
