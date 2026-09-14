import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-ground/85 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-6">
        <Logo />
        <div className="ml-3 hidden gap-6 md:flex">
          <a href="#features" className="text-sm font-medium text-muted hover:text-ink">
            Features
          </a>
          <a href="#developers" className="text-sm font-medium text-muted hover:text-ink">
            For developers
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted hover:text-ink">
            Pricing
          </a>
          <a
            href="https://github.com/postbasehq"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            GitHub
          </a>
        </div>
        <div className="ml-auto flex items-center gap-3.5">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-semibold text-ink">
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-blue px-4 py-2 text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md font-display"
          >
            Start for $0
          </Link>
        </div>
      </div>
    </nav>
  );
}
