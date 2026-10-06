import { afterEach, describe, expect, it } from "vitest";
import { counted, installFakeNet, json } from "./helpers/fake-net";
import { deleteAccount, planAccountDeletion } from "@/lib/account/delete";
import { deleteWorkspaceAs, leaveWorkspaceAs, planWorkspaceRemoval } from "@/lib/account/workspace";

const U = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SOLO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SHARED = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PAYER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NAMES: Record<string, string> = { [SOLO]: "My Studio", [SHARED]: "Client Co" };

type World = { members: { org_id: string; user_id: string; role: string }[]; dependants: { id: string; name: string; billing_org_id: string }[]; myWorkspaces?: number; billing_org_id?: string | null };
let net: ReturnType<typeof installFakeNet>;
afterEach(() => net.restore());

function world(w: World) {
  net = installFakeNet((r) => {
    if (r.url.host !== "db.test") return json({});
    if (r.url.pathname.startsWith("/storage/")) return json([]);
    if (r.url.pathname.startsWith("/auth/v1/admin/users/")) return json({});
    const q = r.query;
    if (r.table === "org_members" && q.includes(`user_id=eq.${U}`) && (r.method === "HEAD" || q.includes("count"))) return counted(w.myWorkspaces ?? 2);
    if (r.table === "org_members" && r.method === "GET" && q.includes(`user_id=eq.${U}`)) {
      return json(w.members.filter((m) => m.user_id === U).map((m) => ({ org_id: m.org_id, role: m.role, orgs: { id: m.org_id, name: NAMES[m.org_id] } })));
    }
    if (r.table === "org_members" && r.method === "GET") {
      const org = q.match(/org_id=eq\.([0-9a-f-]+)/)?.[1];
      return json(w.members.filter((m) => !org || m.org_id === org));
    }
    if (r.table === "orgs" && r.method === "GET" && q.includes("billing_org_id=")) return json(w.dependants);
    if (r.table === "orgs" && r.method === "GET") {
      const row = { id: SHARED, name: "Client Co", stripe_subscription_id: null, subscription_status: null, billing_org_id: w.billing_org_id ?? null };
      return r.single ? json(row) : json([row]);
    }
    if (r.table === "channels") return json([]);
    return json([]);
  });
}
const writes = () => net.writes().map((w) => w.replace(new RegExp(U, "g"), "USER").replace(new RegExp(SOLO, "g"), "SOLO").replace(new RegExp(SHARED, "g"), "SHARED").replace(new RegExp(PAYER, "g"), "PAYER"));

describe("account deletion", () => {
  it("deletes solo workspaces, leaves shared ones, then removes the login", async () => {
    world({ members: [{ org_id: SOLO, user_id: U, role: "owner" }, { org_id: SHARED, user_id: U, role: "member" }, { org_id: SHARED, user_id: OTHER, role: "owner" }], dependants: [] });
    const plan = await deleteAccount(U, "John_Doe@Example.com");
    expect(plan.purge.map((o) => o.name)).toEqual(["My Studio"]);
    expect(plan.leave.map((o) => o.name)).toEqual(["Client Co"]);
    const w = writes();
    expect(w).toContain("DELETE orgs ?id=eq.SOLO");
    expect(w).toContain("DELETE org_members ?org_id=eq.SHARED&user_id=eq.USER");
    // Emails matched exactly: "_" must not act as a wildcard.
    expect(w).toContain("DELETE org_invites ?email=in.(John_Doe@Example.com,john_doe@example.com)");
    expect(w.some((x) => /ilike/.test(x))).toBe(false);
    expect(net.log.at(-1)?.url.pathname).toBe(`/auth/v1/admin/users/${U}`);
  });

  it("refuses, writing nothing, when it would strand a team", async () => {
    world({ members: [{ org_id: SHARED, user_id: U, role: "owner" }, { org_id: SHARED, user_id: OTHER, role: "member" }], dependants: [] });
    await expect(deleteAccount(U, "me@example.com")).rejects.toThrow(/only owner/);
    expect(writes()).toEqual([]);
  });

  it("refuses when a workspace being deleted pays for one that isn't", async () => {
    world({ members: [{ org_id: SOLO, user_id: U, role: "owner" }], dependants: [{ id: PAYER, name: "Side Brand", billing_org_id: SOLO }] });
    expect((await planAccountDeletion(U)).blockers[0]).toMatch(/Side Brand/);
  });
});

describe("workspace leave and delete", () => {
  it("a member can leave; their access there goes with them", async () => {
    world({ members: [{ org_id: SHARED, user_id: U, role: "member" }, { org_id: SHARED, user_id: OTHER, role: "owner" }], dependants: [] });
    expect((await planWorkspaceRemoval(U, SHARED))?.deleteBlocker).toMatch(/Only owners/);
    await leaveWorkspaceAs(U, SHARED);
    expect(writes()).toEqual(expect.arrayContaining(["DELETE org_members ?org_id=eq.SHARED&user_id=eq.USER", "DELETE api_keys ?org_id=eq.SHARED&created_by=eq.USER"]));
  });
  it("the only owner of a team can't leave; nobody can remove their only workspace", async () => {
    world({ members: [{ org_id: SHARED, user_id: U, role: "owner" }, { org_id: SHARED, user_id: OTHER, role: "member" }], dependants: [] });
    expect((await planWorkspaceRemoval(U, SHARED))?.leaveBlocker).toMatch(/only owner/);
    world({ members: [{ org_id: SHARED, user_id: U, role: "owner" }], dependants: [], myWorkspaces: 1 });
    await expect(deleteWorkspaceAs(U, SHARED)).rejects.toThrow(/only workspace/);
    expect(writes()).toEqual([]);
  });
  it("deleting a workspace on another's plan hands its usage to the payer first", async () => {
    world({ members: [{ org_id: SHARED, user_id: U, role: "owner" }], dependants: [], billing_org_id: PAYER });
    await deleteWorkspaceAs(U, SHARED);
    const w = writes();
    const moved = w.indexOf("PATCH ai_generations ?org_id=eq.SHARED");
    expect(moved).toBeGreaterThanOrEqual(0);
    expect(w).toContain("PATCH agent_messages ?org_id=eq.SHARED");
    expect(w.indexOf("DELETE orgs ?id=eq.SHARED")).toBeGreaterThan(moved);
  });
});
