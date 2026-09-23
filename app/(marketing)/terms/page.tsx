import type { Metadata } from "next";
import { LegalHeader } from "@/components/LegalHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { renderLegal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service · Postbase",
  description: "The terms for using Postbase.",
};

export default async function TermsPage() {
  const html = await renderLegal("terms-of-service.md");
  return (
    <>
      <LegalHeader />
      <main className="mx-auto max-w-[760px] px-6 py-13">
        <article className="prose-legal" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <SiteFooter />
    </>
  );
}
