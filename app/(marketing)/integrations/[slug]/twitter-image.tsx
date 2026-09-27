import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { networkBySlug } from "@/lib/seo/networks";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default async function Image({ params }: { params: { slug: string } }) {
  const n = networkBySlug(params.slug);
  if (!n) return ogImage({ label: "Integrations", title: "Every network, one calendar" });
  return ogImage({ label: n.eyebrow, title: `${n.h1[0]} ${n.h1[1]}`, brands: [n.id] });
}
