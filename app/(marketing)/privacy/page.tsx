import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { LegalPage } from "@/components/LegalPage";
import { renderLegal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  ...pageMeta("/privacy"),
  description: "How Postbase (Berkway Group Limited) handles your data.",
};

export default async function PrivacyPage() {
  const doc = await renderLegal("privacy-policy.md");
  return (
    <LegalPage
      doc={doc}
      current="/privacy"
      summary="What we collect when you use Postbase, why we collect it, who we share it with, and the choices you have."
    />
  );
}
