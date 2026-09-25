import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Postbase: The open-source social media scheduler for creators and AI agents",
    template: "%s · Postbase",
  },
  description:
    "Schedule and publish to X, LinkedIn, Instagram, TikTok, YouTube, Bluesky and Mastodon from one calendar. Open source, with an MCP server so AI agents can post for you.",
  applicationName: "Postbase",
  keywords: [
    "social media scheduler",
    "schedule social media posts",
    "open source social media scheduler",
    "social media management tool",
    "MCP server",
    "AI agent social media",
    "Claude social media",
    "social media API",
    "Buffer alternative",
    "Hootsuite alternative",
  ],
  openGraph: {
    type: "website",
    siteName: "Postbase",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    site: "@postbasehq",
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#3B5BDB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
