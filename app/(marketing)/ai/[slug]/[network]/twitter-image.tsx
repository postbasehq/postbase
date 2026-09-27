import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { getCombo } from "@/lib/seo/combos";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default async function Image({ params }: { params: { slug: string; network: string } }) {
  const c = getCombo(params.slug, params.network);
  if (!c) return ogImage({ label: "AI tools", title: "Let your AI post to social media" });
  return ogImage({
    label: `${c.client.name} + ${c.network.name}`,
    title: `Post to ${c.network.name} from ${c.client.name}`,
    clients: [c.client.logo],
    brands: [c.network.id],
  });
}
