import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default function Image() {
  return ogImage({ label: "Free tool", title: "Best time to post on social media", brands: ["instagram", "tiktok", "linkedin", "x", "facebook", "youtube", "threads"] });
}
