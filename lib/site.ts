import type { Metadata } from "next";

/** Canonical site origin. postbase.so permanently redirects to www. */
export const SITE_URL = "https://www.postbase.so";
export const SITE_NAME = "Postbase";

const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Postbase: the open-source social media scheduler for creators and AI agents",
};

/**
 * Per-page canonical + social tags. Next replaces (not merges) a parent's
 * openGraph/twitter objects when a page sets its own, so every page gets the
 * full set here, pointing at its own URL.
 *
 * Pages with their own opengraph-image/twitter-image file pass
 * `{ ownImage: true }`: an image set here would win over the file.
 */
export function pageMeta(
  path: string,
  { ownImage = false }: { ownImage?: boolean } = {},
): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
  return {
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GB", url: path, ...(ownImage ? {} : { images: [OG_IMAGE] }) },
    twitter: { card: "summary_large_image", site: "@postbasehq", ...(ownImage ? {} : { images: [OG_IMAGE.url] }) },
  };
}
