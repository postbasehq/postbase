import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { aiLimitMessage, aiUsage, billingGroup } from "@/lib/billing-guard";
import { createAdminClient } from "@/lib/supabase/admin";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let org: Record<string, unknown>;
let failOrgRead: boolean;
let net: ReturnType<typeof installFakeNet>;

beforeEach(() => {
  process.env.FORCE_BILLING = "1";
  failOrgRead = false;
  net = installFakeNet((r) => {
    if (r.table === "orgs" && r.url.searchParams.get("id")) {
      if (failOrgRead) return json({ code: "08006", message: "connection reset" }, 400);
      return r.single ? json(org) : json([org]);
    }
    if (r.table === "orgs") return json([]);
    if (r.table === "ai_generations") return new Response(null, { status: 200, headers: { "content-range": "0-0/5" } });
    return json([]);
  });
});
afterEach(() => {
  net.restore();
  delete process.env.FORCE_BILLING;
});

const agency = (status: string | null, comped = false) => ({ id: ORG, name: "Acme", billing_org_id: null, plan: "agency", subscription_status: status, comped });

describe("plan allowances", () => {
  it("a trial gets trial-sized AI allowances, with a message that says how to unlock", async () => {
    org = agency("trialing");
    const u = await aiUsage(createAdminClient(), ORG);
    expect(u.image.limit).toBe(5);
    expect(u.video.limit).toBe(1);
    expect(await aiLimitMessage(createAdminClient(), ORG, "image")).toMatch(/free trial includes 5 AI images.*600 a month/);
  });
  it("a paid or comped plan gets the full allowance", async () => {
    org = agency("active");
    expect((await aiUsage(createAdminClient(), ORG)).image.limit).toBe(600);
    org = agency("trialing", true);
    expect((await aiUsage(createAdminClient(), ORG)).image.limit).toBe(600);
  });
  it("a failed billing read throws instead of reading as 'no plan'", async () => {
    failOrgRead = true;
    await expect(billingGroup(ORG)).rejects.toThrow(/connection reset/);
  });
});
