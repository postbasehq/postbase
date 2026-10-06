import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { syncSubscription } from "@/lib/stripe-sync";
import { createAdminClient } from "@/lib/supabase/admin";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let org: Record<string, unknown>;
let failWrites: boolean;
let net: ReturnType<typeof installFakeNet>;

beforeEach(() => {
  org = { id: ORG, stripe_subscription_id: null, subscription_status: null, plan: "trial" };
  failWrites = false;
  net = installFakeNet((r) => {
    if (r.table !== "orgs") return undefined;
    if (r.method === "GET") return r.single ? json(org) : json([org]);
    if (r.method === "PATCH") {
      if (failWrites) return json({ code: "08006", message: "connection reset" }, 400);
      Object.assign(org, r.body as object);
      return json([]);
    }
  });
});
afterEach(() => net.restore());

const sub = (id: string, status: string, price = "price_creator") =>
  ({ id, status, customer: "cus_1", metadata: { org_id: ORG }, items: { data: [{ price: { id: price }, current_period_end: 1800000000 }] } }) as never;
const sync = (s: never) => syncSubscription(createAdminClient(), s);

describe("Stripe subscription sync is order-proof", () => {
  it("follows a normal lifecycle", async () => {
    expect(await sync(sub("sub_A", "trialing"))).toBe("updated");
    expect(org).toMatchObject({ stripe_subscription_id: "sub_A", subscription_status: "trialing", plan: "creator" });
    expect(await sync(sub("sub_A", "active", "price_team"))).toBe("updated");
    expect(org).toMatchObject({ subscription_status: "active", plan: "team" });
    expect(await sync(sub("sub_A", "canceled"))).toBe("ended");
    expect(org).toMatchObject({ stripe_subscription_id: null, subscription_status: "canceled", plan: "trial" });
  });

  it("a late event for an old subscription can't touch the new one", async () => {
    await sync(sub("sub_A", "active"));
    await sync(sub("sub_A", "canceled"));
    await sync(sub("sub_B", "active"));
    expect(await sync(sub("sub_A", "canceled"))).toBe("ignored");
    expect(org).toMatchObject({ stripe_subscription_id: "sub_B", subscription_status: "active" });
  });

  it("a second live subscription doesn't replace the first", async () => {
    await sync(sub("sub_B", "active"));
    expect(await sync(sub("sub_C", "active"))).toBe("ignored");
    expect(org.stripe_subscription_id).toBe("sub_B");
  });

  it("throws on a failed database write so the webhook answers 500", async () => {
    failWrites = true;
    await expect(sync(sub("sub_A", "active"))).rejects.toThrow(/connection reset/);
  });
});
