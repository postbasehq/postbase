import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-10 text-[13px] text-muted">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="flex flex-wrap items-center justify-between gap-7">
          <Logo />
          <div className="flex flex-wrap gap-6">
            <a href="/#features" className="hover:text-ink">Features</a>
            <a href="/#developers" className="hover:text-ink">For developers</a>
            <a href="/#pricing" className="hover:text-ink">Pricing</a>
            <a href="https://github.com/postbasehq" className="hover:text-ink">GitHub</a>
            <a href="https://x.com/postbasehq" className="hover:text-ink">X</a>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
        <p className="mt-5 text-xs leading-relaxed">
          © {new Date().getFullYear()} Berkway Group Limited, trading as Postbase.
          Registered in England and Wales.
          <br />
          Postbase is a publishing tool and is not affiliated with X, LinkedIn, or
          Instagram. team@postbase.so
        </p>
      </div>
    </footer>
  );
}
