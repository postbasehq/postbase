import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { competitorBySlug } from "@/lib/seo/competitors";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default async function Image({ params }: { params: { slug: string } }) {
  const c = competitorBySlug(params.slug);
  if (!c) return ogImage({ label: "Compare", title: "How Postbase compares" });
  return ogImage({ label: `Postbase vs ${c.name}`, title: `${c.h1[0]} ${c.h1[1]}` });
}
