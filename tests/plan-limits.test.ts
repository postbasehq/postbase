import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeNet, json, counted } from "./helpers/fake-net";
import { aiLimitMessage, aiUsage, schedulingProblem } from "@/lib/billing-guard";
import { overLimitMessage } from "@/lib/x-links";
import { createAdminClient } from "@/lib/supabase/admin";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let org: Record<string, unknown>;
let linked: { id: string }[];
let channels: number;
let members: string[];
let invites: string[];
let net: ReturnType<typeof installFakeNet>;

beforeEach(() => {
  process.env.FORCE_BILLING = "1";
  linked = [];
  channels = 3;
  members = ["u1"];
  invites = [];
  net = installFakeNet((r) => {
    if (r.table === "orgs" && r.url.searchParams.get("id")) return r.single ? json(org) : json([org]);
    if (r.table === "orgs") return json(linked);
    if (r.table === "channels") return counted(channels);
    if (r.table === "org_members") return json(members.map((user_id) => ({ user_id })));
    if (r.table === "org_invites") return json(invites.map((email) => ({ email })));
    if (r.table === "ai_generations") return counted(0);
    return json([]);
  });
});
afterEach(() => {
  net.restore();
  delete process.env.FORCE_BILLING;
});

const on = (plan: string, status: string | null, comped = false) => ({ id: ORG, name: "Acme", billing_org_id: null, plan, subscription_status: status, comped });

describe("a failed payment (past_due)", () => {
  it("keeps publishing but drops paid-per-use extras to trial level, and says why", async () => {
    org = on("agency", "past_due");
    expect(await schedulingProblem(ORG)).toBeNull();
    const u = await aiUsage(createAdminClient(), ORG);
    expect(u.image.limit).toBe(5);
    expect(u.pastDue).toBe(true);
    net.restore();
    net = installFakeNet((r) => {
      if (r.table === "orgs" && r.url.searchParams.get("id")) return r.single ? json(org) : json([org]);
      if (r.table === "ai_generations") return counted(5);
      return json([]);
    });
    expect(await aiLimitMessage(createAdminClient(), ORG, "image")).toMatch(/payment didn't go through/);
    expect(overLimitMessage(3, 2, "past_due")).toMatch(/payment didn't go through.*this thread has 2/);
  });
  it("a comped workspace is never treated as past due", async () => {
    org = on("agency", "past_due", true);
    expect((await aiUsage(createAdminClient(), ORG)).image.limit).toBe(600);
  });
});

describe("a smaller plan applies after a downgrade", () => {
  it("over the channel limit: new posts can't be scheduled until some are disconnected", async () => {
    org = on("creator", "active");
    channels = 12;
    expect(await schedulingProblem(ORG)).toMatch(/Creator plan includes .* channels and you have 12 connected\. Disconnect \d+/);
  });
  it("over the workspace limit", async () => {
    org = on("creator", "active");
    linked = [{ id: "w2" }, { id: "w3" }];
    expect(await schedulingProblem(ORG)).toMatch(/includes 1 workspace and you have 3\. Delete 2/);
  });
  it("over the seat limit, counting pending invites", async () => {
    org = on("creator", "active");
    members = ["u1", "u2"];
    invites = ["c@x.test", "d@x.test"];
    expect(await schedulingProblem(ORG)).toMatch(/there are 4 \(counting pending invites\)/);
  });
  it("within limits, comped, or no plan", async () => {
    org = on("creator", "active");
    expect(await schedulingProblem(ORG)).toBeNull();
    org = on("creator", "active", true);
    channels = 99;
    expect(await schedulingProblem(ORG)).toBeNull();
    org = on("creator", "canceled");
    expect(await schedulingProblem(ORG)).toMatch(/no active plan/);
  });
});
