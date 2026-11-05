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
    href: "/creators",
    line: "One calendar for every network",
  },
  {
    id: "postbots",
    name: "Postbots",
    href: "/postbots",
    line: "Bots you build by chatting",
    isNew: true,
  },
  {
    id: "mcp",
    name: "AI Agents",
    href: "/mcp",
    line: "Let Claude and ChatGPT post",
  },
  {
    id: "api",
    name: "API",
    href: "/",
    line: "Schedule posts from your code",
  },
];
