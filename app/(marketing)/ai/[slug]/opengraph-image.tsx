import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { clientBySlug } from "@/lib/seo/clients";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default async function Image({ params }: { params: { slug: string } }) {
  const c = clientBySlug(params.slug);
  if (!c) return ogImage({ label: "AI tools", title: "Let your AI post to social media" });
  return ogImage({ label: c.eyebrow, title: `${c.h1[0]} ${c.h1[1]}`, clients: [c.logo], brands: ["x", "linkedin", "bluesky", "mastodon"] });
}
