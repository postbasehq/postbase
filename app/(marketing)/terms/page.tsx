import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { renderLegal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service · Postbase",
  description: "The terms for using Postbase.",
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
