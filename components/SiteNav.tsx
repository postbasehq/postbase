import Link from "next/link";
import { Logo } from "./Logo";
import { PreviewBanner } from "./PreviewBanner";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#channels", label: "Channels" },
  { href: "/#pricing", label: "Pricing" },
  { href: "https://docs.postbase.so", label: "Docs" },
  { href: "https://github.com/postbasehq", label: "GitHub" },
];

/** Marketing nav. */
export function SiteNav() {
  return (
    <div className="sticky top-0 z-50">
      <PreviewBanner />
      <nav className="bg-ground/85 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-4 px-5 md:gap-6 md:px-8">
          <div className="flex items-center gap-7">
            <Logo />
            <div className="hidden gap-6 lg:flex">
              {LINKS.map((l) => (
                <a key={l.label} href={l.href} className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center justify-end gap-3.5">
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
