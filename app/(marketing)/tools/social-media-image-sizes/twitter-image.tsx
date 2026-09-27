import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default function Image() {
  return ogImage({ label: "Free tool", title: "Social media image and video sizes", brands: ["instagram", "tiktok", "youtube", "x", "linkedin", "facebook", "threads"] });
}
