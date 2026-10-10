import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { personaBySlug } from "@/lib/seo/personas";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default async function Image({ params }: { params: { slug: string } }) {
  const p = personaBySlug(params.slug);
  if (!p) return ogImage({ label: "Postbase", title: "Grow an audience on every network without living on social media." });
  return ogImage({ label: p.eyebrow, title: `${p.h1[0]} ${p.h1[1]}`, brands: ["x", "linkedin", "bluesky", "mastodon", "tiktok", "youtube"] });
}
