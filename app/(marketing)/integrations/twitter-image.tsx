import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default function Image() {
  return ogImage({ label: "Integrations", title: "Every network, one calendar", brands: ["x","linkedin","bluesky","mastodon","tiktok","youtube"], clients: [] });
}
