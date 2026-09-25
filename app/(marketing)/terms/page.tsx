import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { LegalPage } from "@/components/LegalPage";
import { renderLegal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  ...pageMeta("/terms"),
  description: "The terms for using Postbase, the social media scheduler run by Berkway Group Limited: accounts, connected channels, API and MCP access, billing and more.",
};

export default async function TermsPage() {
  const doc = await renderLegal("terms-of-service.md");
  return (
    <LegalPage
      doc={doc}
      current="/terms"
      summary="The agreement between you and Berkway Group Limited, trading as Postbase, for using the hosted service."
    />
  );
}
