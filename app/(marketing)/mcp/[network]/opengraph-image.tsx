import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { mcpNetwork } from "@/lib/seo/mcp";
import { LIVE_NETWORKS } from "@/lib/seo/networks";

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Postbase";

export default async function Image({ params }: { params: { network: string } }) {
  const m = mcpNetwork(params.network);
  const n = LIVE_NETWORKS.find((x) => x.slug === params.network);
  if (!m || !n) return ogImage({ label: "MCP server", title: "The social media MCP server" });
  return ogImage({ label: "MCP server", title: `The ${n.name} MCP server`, brands: [n.id] });
}
