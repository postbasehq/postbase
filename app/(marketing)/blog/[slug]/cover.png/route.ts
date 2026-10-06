import { ogImage } from "@/lib/og";
import { getPost, listPosts } from "@/lib/blog";

/*
 * The post's card image at a stable URL, for the BlogPosting `image` in the
 * page's JSON-LD. The opengraph-image file route gets a build hash in its URL,
 * so structured data can't point at it.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return listPosts().map((p) => ({ slug: p.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  if (!p) return new Response("Not found", { status: 404 });
  return ogImage({ label: p.category, title: p.title });
}
