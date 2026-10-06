import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { trialEligible } from "@/lib/trial";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let net: ReturnType<typeof installFakeNet>;
afterEach(() => net.restore());
const withOrg = (row: Record<string, unknown> | null, fail = false) =>
  (net = installFakeNet((r) => (r.table === "orgs" ? (fail ? json({ code: "08006", message: "down" }, 400) : r.single ? json(row) : json(row ? [row] : [])) : undefined)));

describe("who gets the 7-day free trial", () => {
  it("a workspace that has never subscribed", async () => {
    withOrg({ subscription_status: null, stripe_customer_id: null });
    expect(await trialEligible(ORG)).toBe(true);
  });
  it.each(["trialing", "active", "past_due", "canceled", "incomplete_expired"])("not after any subscription (%s)", async (status) => {
    withOrg({ subscription_status: status, stripe_customer_id: "cus_1" });
    expect(await trialEligible(ORG)).toBe(false);
  });
  it("fails safe (no trial promised) if the database can't be read", async () => {
    withOrg(null, true);
    expect(await trialEligible(ORG)).toBe(false);
  });
});
