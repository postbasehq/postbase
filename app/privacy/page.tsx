import type { Metadata } from "next";
import { LegalHeader } from "@/components/LegalHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { renderLegal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Postbase",
  description: "How Postbase (Berkway Group Limited) handles your data.",
};

export default async function PrivacyPage() {
  const html = await renderLegal("privacy-policy.md");
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
