import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { getEntry } from "@/lib/changelog";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

const LABEL = { new: "New", improved: "Improved", fixed: "Fixed" } as const;

export default async function Image({ params }: { params: { slug: string } }) {
  const e = getEntry(params.slug);
  if (!e) return ogImage({ label: "Changelog", title: "What's new in Postbase" });
  return ogImage({ label: `Changelog · ${LABEL[e.type]}`, title: e.title });
}
