import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { notifyPostsFailed, notifyReconnect, sendInviteEmail } from "@/lib/email/notify";

const AUTHOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const XSS = `<img src=x onerror=alert(1)><script>alert(2)</script>`;
let sentLog: Set<string>;
let posts: unknown[];
let resendDown: boolean;
let sent: { to: string[]; subject: string; html: string }[];
let net: ReturnType<typeof installFakeNet>;

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  sentLog = new Set();
  posts = [];
  resendDown = false;
  sent = [];
  net = installFakeNet((r) => {
    if (r.url.host === "api.resend.com") {
      if (resendDown) return json({ message: "down" }, 500);
      sent.push(r.body as never);
      return json({ id: "em" });
    }
    if (r.url.pathname.startsWith("/auth/v1/admin/users/")) {
      const id = r.url.pathname.split("/").pop();
      return json({ id, email: `${id?.slice(0, 4)}@example.com` });
    }
    if (r.table === "email_log" && r.method === "POST") {
      const fresh = (r.body as { key: string }[]).filter((x) => !sentLog.has(x.key));
      fresh.forEach((x) => sentLog.add(x.key));
      return json(fresh, 201);
    }
    if (r.table === "email_log" && r.method === "DELETE") {
      for (const k of r.query.match(/key=in\.\((.*)\)/)?.[1].split(",") ?? []) sentLog.delete(k.replace(/^"|"$/g, ""));
      return json([]);
    }
    if (r.table === "posts") return json(posts);
    if (r.table === "org_members") return json([{ user_id: OWNER }]);
    if (r.table === "channels") {
      const ch = { id: "ch1", org_id: "o", platform: "linkedin", handle: XSS, status: "reconnect", status_error: "invalid_grant", status_at: "t1" };
      return r.single ? json(ch) : json([ch]);
    }
    if (r.table === "post_targets") return new Response(null, { status: 200, headers: { "content-range": "0-0/3" } });
    return json([]);
  });
});
afterEach(() => {
  net.restore();
  delete process.env.RESEND_API_KEY;
});

const failed = (claimed = "2026-10-05T10:00:00Z") => ({ status: "failed", error: "boom", next_attempt_at: null, claimed_at: claimed, platform_post_id: null, channels: { platform: "x", handle: "@me" } });
const post = (id: string, author: string | null, body: string, claimed?: string) => ({ id, org_id: "o", author_id: author, body, status: "failed", post_targets: [failed(claimed)] });

describe("failure emails", () => {
  it("one email per failure, escaped, never sent twice", async () => {
    posts = [post("p1", AUTHOR, `Launch ${XSS}`)];
    await notifyPostsFailed(["p1"]);
    await notifyPostsFailed(["p1"]);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["aaaa@example.com"]);
    expect(sent[0].html).not.toMatch(/<script|<img src=x/);
  });
  it("a lapsed plan failing many posts sends one email per person, not one per post", async () => {
    posts = Array.from({ length: 12 }, (_, i) => post(`q${i}`, AUTHOR, `post ${i}`)).concat([post("api", null, "via API")]);
    await notifyPostsFailed(posts.map((p) => (p as { id: string }).id));
    expect(sent).toHaveLength(2);
    expect(sent.find((m) => m.to.includes("aaaa@example.com"))?.subject).toBe("12 of your posts didn't go out");
    expect(sent.find((m) => m.to.includes("bbbb@example.com"))).toBeTruthy();
  });
  it("if Resend is down nothing is marked sent, so the next run retries", async () => {
    posts = [post("r1", AUTHOR, "retry me")];
    resendDown = true;
    await notifyPostsFailed(["r1"]);
    expect(sentLog.size).toBe(0);
    resendDown = false;
    await notifyPostsFailed(["r1"]);
    expect(sent).toHaveLength(1);
  });
  it("a new failure after a manual Retry is emailed again", async () => {
    posts = [post("p2", AUTHOR, "again")];
    await notifyPostsFailed(["p2"]);
    posts = [post("p2", AUTHOR, "again", "2026-10-05T11:00:00Z")];
    await notifyPostsFailed(["p2"]);
    expect(sent).toHaveLength(2);
  });
});

describe("other emails", () => {
  it("reconnect goes to owners/admins once per incident, escaped", async () => {
    await notifyReconnect("ch1");
    await notifyReconnect("ch1");
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain("3 posts are waiting");
    expect(sent[0].html).not.toMatch(/<script|<img src=x/);
  });
  it("invite subjects carry no control characters, and a re-send (new link) is emailed", async () => {
    await sendInviteEmail({ id: "i1", email: "new@person.com", token: "tok_one_1234567890", role: "member", orgName: "Acme\r\nBcc: victim@x.com", inviter: "boss@acme.com" });
    await sendInviteEmail({ id: "i1", email: "new@person.com", token: "tok_two_1234567890", role: "member", orgName: "Acme", inviter: "boss@acme.com" });
    expect(sent).toHaveLength(2);
    expect(sent[0].subject).not.toMatch(/[\r\n]/);
  });
});
