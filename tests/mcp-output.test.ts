import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import { OUTPUT, structured } from "@/lib/mcp-output";

// MCP clients check structuredContent against the tool's outputSchema and fail
// the call if it doesn't match, so every real result shape must validate.
const ajv = new Ajv({ strict: false });
const NOW = "2026-10-08T12:00:00.000Z";
const valid = (name: keyof typeof OUTPUT, out: unknown) => {
  const check = ajv.compile(OUTPUT[name]);
  const ok = check(structured(name, out, NOW));
  return ok ? true : check.errors;
};

describe("MCP output schemas", () => {
  it("wrap lists in an object and add the server time", () => {
    expect(structured("list_channels", [], NOW)).toEqual({ channels: [], server_time: NOW });
    expect(structured("cancel_post", { cancelled: true, message: "ok" }, NOW)).toEqual({ cancelled: true, message: "ok", server_time: NOW });
  });

  it("accept every real result, nulls and empty lists included", () => {
    expect(valid("list_channels", [])).toBe(true);
    expect(valid("list_channels", [{ id: "c1", platform: "x", handle: null, status: "active" }])).toBe(true);
    expect(valid("list_media", [{ id: "m1", name: "a.png", type: "image/png", size_bytes: null, url: "https://x/a.png", created_at: NOW }])).toBe(true);
    expect(
      valid("list_scheduled", [
        { id: "p1", body: null, scheduled_at: null, status: "draft", post_targets: [] },
        { id: "p2", body: "hi", scheduled_at: NOW, status: "scheduled", post_targets: [{ channel_id: "c1", status: "pending" }] },
      ]),
    ).toBe(true);
    expect(valid("create_post", { id: "p1", body: "", scheduled_at: null, status: "draft", media: 0 })).toBe(true);
    expect(valid("create_post", { id: "p1", body: "hi", scheduled_at: NOW, status: "scheduled", media: 2, warning: "X charges for links" })).toBe(true);
    expect(valid("cancel_post", { cancelled: false, message: "Already published" })).toBe(true);
  });

  it("reject a result missing its required fields", () => {
    expect(valid("create_post", { body: "hi" })).not.toBe(true);
  });
});
