import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Postbase, or create an account with Google, GitHub or a magic link. No password needed.",
  ...pageMeta("/login"),
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
