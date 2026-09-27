import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default function Image() {
  return ogImage({ label: "Free tool", title: "Social media character counter", brands: ["x","bluesky","linkedin","mastodon","threads"], clients: [] });
}
