import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { getPost } from "@/lib/blog";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default async function Image({ params }: { params: { slug: string } }) {
  const p = getPost(params.slug);
  if (!p) return ogImage({ label: "Blog", title: "Posting, agents and APIs" });
  return ogImage({ label: p.category, title: p.title });
}
