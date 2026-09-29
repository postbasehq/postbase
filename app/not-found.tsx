import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RunnerGame } from "@/components/marketing/RunnerGame";
import { PrimaryButton, SecondaryButton, card, wrap } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className={`${wrap} pb-24 pt-16 text-center md:pt-24`}>
        <p className="font-mono text-[13px] font-medium text-muted">404</p>
        <h1 className="mx-auto mt-4 max-w-[16ch] text-balance font-display text-[clamp(36px,5.5vw,64px)] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
          This page never got posted
        </h1>
        <p className="mx-auto mt-5 max-w-[48ch] text-balance text-[17px] leading-relaxed text-muted">
          The link may be old or mistyped. While you&apos;re here, see how many networks you can clear.
        </p>

        <div className={`${card} mx-auto mt-10 max-w-[860px] p-5 text-left md:p-7`}>
          <RunnerGame />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton href="/">Back to the homepage</PrimaryButton>
          <SecondaryButton href="/contact">Contact us</SecondaryButton>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
