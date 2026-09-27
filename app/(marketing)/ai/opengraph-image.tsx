import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default function Image() {
  return ogImage({ label: "MCP server", title: "Let your AI post to social media", brands: [], clients: ["claude","claude-code","cursor","vscode","windsurf","gemini"] });
}
