/**
 * Postbase's products, for the nav's Products menu (and its mobile drawer).
 * Plain data so server components can read it too.
 */

export type ProductId = "scheduler" | "postbots" | "mcp" | "api";

export const PRODUCTS: {
  id: ProductId;
  name: string;
  href: string;
  /** One line under the name in the list. */
  line: string;
  isNew?: boolean;
}[] = [
  {
    id: "scheduler",
    name: "Scheduler",
    href: "/#features",
    line: "One calendar for every network",
  },
  {
    id: "postbots",
    name: "Postbots",
    href: "/bots",
    line: "Bots you build by chatting",
    isNew: true,
  },
  {
    id: "mcp",
    name: "MCP server",
    href: "/mcp",
    line: "Let Claude and ChatGPT post",
  },
  {
    id: "api",
    name: "REST API",
    href: "/developers",
    line: "Schedule posts from your code",
  },
];
