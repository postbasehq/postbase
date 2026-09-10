import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function LegalHeader() {
  return (
    <nav className="border-b border-line bg-ground">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3.5 px-6">
        <Logo />
        <div className="ml-auto flex items-center gap-3.5">
          <ThemeToggle />
          <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
            ← Home
          </Link>
        </div>
      </div>
    </nav>
  );
}
