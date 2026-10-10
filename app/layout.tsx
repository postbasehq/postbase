import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { ThemeScript } from "@/components/ThemeScript";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  // 800 is only for the footer wordmark.
  weight: ["400", "500", "600", "800"],
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
    default: "Postbase: the open-source distribution and social growth platform",
    template: "%s · Postbase",
  },
  description:
    "Grow an audience on every network without living on social media. The open-source social media scheduler, listening bots and AI agents in one growth platform.",
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
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
