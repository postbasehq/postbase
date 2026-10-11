import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { connectedApps, disconnectApp, openAppTools, runAppTool } from "@/lib/postbots/apps";

const COMPOSIO = "backend.composio.dev";

describe("Postbots apps (Composio)", () => {
  let restore: (() => void) | undefined;
  beforeEach(() => {
    process.env.COMPOSIO_API_KEY = "test-key";
  });
  afterEach(() => {
    restore?.();
    delete process.env.COMPOSIO_API_KEY;
  });

  const accounts = [
    { id: "ca_notion", status: "ACTIVE", toolkit: { slug: "NOTION" } },
    { id: "ca_slack_pending", status: "INITIATED", toolkit: { slug: "slack" } },
    { id: "ca_other", status: "ACTIVE", toolkit: { slug: "someotherapp" } },
  ];

  it("asks only for this workspace's accounts, and uses only active ones from our catalogue", async () => {
    const net = installFakeNet((req) => (req.url.host === COMPOSIO ? json({ items: accounts, next_cursor: null }) : undefined));
    restore = net.restore;
    expect(await connectedApps("org1")).toEqual(["notion"]);
    expect(net.log[0].url.searchParams.getAll("user_ids")).toEqual(["postbase_org_org1"]);
    expect(net.log[0].headers.get("x-api-key")).toBe("test-key");
  });

  it("disconnecting deletes only that app's accounts in this workspace", async () => {
    const net = installFakeNet((req) => {
      if (req.url.host !== COMPOSIO) return undefined;
      if (req.method === "GET") return json({ items: accounts, next_cursor: null });
      return json({}, 200);
    });
    restore = net.restore;
    await disconnectApp("org1", "notion");
    const deletes = net.log.filter((r) => r.method === "DELETE").map((r) => r.url.pathname);
    expect(deletes).toEqual(["/api/v3.1/connected_accounts/ca_notion"]);
  });

  it("opens a session with no in-chat connecting, no workbench and no destructive tools", async () => {
    const net = installFakeNet((req) => {
      if (req.url.host !== COMPOSIO) return undefined;
      if (req.url.pathname.endsWith("/tool_router/session")) return json({ session_id: "trs_1" }, 201);
      return json({ items: [{ slug: "COMPOSIO_SEARCH_TOOLS", description: "Search", input_parameters: { properties: { q: { type: "string" } } } }] });
    });
    restore = net.restore;
    const session = await openAppTools("org1", ["notion"]);
    expect(session?.id).toBe("trs_1");
    expect(session?.tools[0]).toMatchObject({ name: "COMPOSIO_SEARCH_TOOLS", input_schema: { type: "object" } });
    expect(net.log[0].body).toMatchObject({
      user_id: "postbase_org_org1",
      toolkits: { enable: ["notion"] },
      manage_connections: { enable: false },
      workbench: { enable: false },
      proxy_execute: { enable: false },
      tags: { disable: ["destructiveHint"] },
    });
  });

  it("opens no session when nothing is connected or apps are off", async () => {
    expect(await openAppTools("org1", [])).toBeNull();
    delete process.env.COMPOSIO_API_KEY;
    expect(await openAppTools("org1", ["notion"])).toBeNull();
    expect(await connectedApps("org1")).toEqual([]);
  });

  it("runs meta tools and app tools through their own endpoints, and caps big results", async () => {
    const net = installFakeNet((req) => {
      if (req.url.host !== COMPOSIO) return undefined;
      if (req.url.pathname.endsWith("/execute_meta")) return json({ result_type: "completed", data: { tools: ["NOTION_SEARCH"] }, error: null });
      return json({ result_type: "completed", data: { text: "x".repeat(20_000) }, error: null });
    });
    restore = net.restore;
    expect(await runAppTool("trs_1", "COMPOSIO_SEARCH_TOOLS", { q: "pages" })).toContain("NOTION_SEARCH");
    const big = await runAppTool("trs_1", "NOTION_SEARCH", {});
    expect(big.length).toBeLessThan(12_100);
    expect(big).toContain("(cut; ask for less)");
    expect(net.log.map((r) => r.url.pathname)).toEqual([
      "/api/v3.1/tool_router/session/trs_1/execute_meta",
      "/api/v3.1/tool_router/session/trs_1/execute",
    ]);
    expect(net.log[0].body).toEqual({ slug: "COMPOSIO_SEARCH_TOOLS", arguments: { q: "pages" } });
    expect(net.log[1].body).toEqual({ tool_slug: "NOTION_SEARCH", arguments: {} });
  });

  it("tells the model about failures instead of throwing", async () => {
    const net = installFakeNet((req) => (req.url.host === COMPOSIO ? json({ result_type: "failed", data: { results: [{ error: "Page not found" }] }, error: "1 out of 1 tools failed" }) : undefined));
    restore = net.restore;
    expect(await runAppTool("trs_1", "NOTION_GET_PAGE", { id: "x" })).toContain("Page not found");
  });
});
