import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimKeys, emailConfigured, releaseKeys, sendEmail, sendEmailOnce } from "@/lib/email/send";
import { APP_URL, esc, excerpt, layout, list, list as listBlock, p } from "@/lib/email/templates";
import { explainPostError, PLATFORM_LABEL } from "@/lib/post-errors";
import { reconnectReason } from "@/lib/channel-health";
import { PLANS, planForPrice } from "@/lib/plans";

/*
 * Who gets which email, and when. Every function is best-effort (never
 * throws) and sends at most once per event via sendEmailOnce's key.
 *   Posts failed     → the post's author (owners/admins if it has none, e.g. API posts), batched per run
 *   Reconnect needed → owners/admins (they can reconnect)
 *   Team invite      → the invited address
 *   Welcome          → the new user
 *   Billing          → owners/admins of the paying workspace
 */

type Db = ReturnType<typeof createAdminClient>;

const label = (platform: string | null | undefined) => PLATFORM_LABEL[platform ?? ""] ?? platform ?? "a channel";

async function emailsOf(db: Db, userIds: (string | null | undefined)[]): Promise<string[]> {
  const ids = [...new Set(userIds.filter((u): u is string => Boolean(u)))];
  const found = await Promise.all(
    ids.map((id) => db.auth.admin.getUserById(id).then((r) => r.data.user?.email ?? null, () => null)),
  );
  return found.filter((e): e is string => Boolean(e));
}

async function managerEmails(db: Db, orgId: string): Promise<string[]> {
  const { data } = await db.from("org_members").select("user_id").eq("org_id", orgId).in("role", ["owner", "admin"]);
  return emailsOf(db, (data ?? []).map((m) => m.user_id as string));
}

async function guard(what: string, fn: () => Promise<unknown>): Promise<void> {
  if (!emailConfigured()) return;
  try {
    await fn();
  } catch (e) {
    console.error(`[email] ${what}:`, e instanceof Error ? e.message : e);
  }
}

type FailedTarget = {
  status: string;
  error: string | null;
  next_attempt_at: string | null;
  claimed_at: string | null;
  platform_post_id: string | null;
  channels: { platform: string; handle: string | null } | null;
};

/**
 * Posts that ended up failed in one publisher run. Grouped so each person gets
 * one email per run, however many posts failed (a lapsed plan can fail dozens
 * at once). Each post is claimed by its own key — a manual Retry claims the
 * target again, so a later failure has a new claim time and is reported again.
 *   Recipient: the post's author; owners/admins when it has none (API posts).
 */
export function notifyPostsFailed(postIds: string[]): Promise<void> {
  return guard(`posts-failed (${postIds.length})`, async () => {
    if (postIds.length === 0) return;
    const db = createAdminClient();
    const { data: rows } = await db
      .from("posts")
      .select("id, org_id, author_id, body, status, post_targets(status, error, next_attempt_at, claimed_at, platform_post_id, channels(platform, handle))")
      .in("id", postIds);

    const posts = (rows ?? [])
      .filter((r) => r.status === "failed")
      .map((r) => {
        const targets = (r.post_targets ?? []) as unknown as FailedTarget[];
        const failed = targets.filter((t) => t.status === "failed" && !t.next_attempt_at && !t.platform_post_id);
        const incident = failed.map((t) => t.claimed_at ?? "").sort().pop() || "na";
        return {
          id: r.id as string,
          orgId: r.org_id as string,
          authorId: r.author_id as string | null,
          body: r.body as string | null,
          failed,
          delivered: targets.filter((t) => t.status === "published" || t.platform_post_id).length,
          key: `post-failed:${r.id}:${incident}`,
        };
      })
      .filter((x) => x.failed.length > 0);

    const claimed = new Set(await claimKeys(posts.map((x) => x.key)));
    const fresh = posts.filter((x) => claimed.has(x.key));

    const groups = new Map<string, typeof fresh>();
    for (const x of fresh) {
      const who = x.authorId ? `user:${x.authorId}` : `org:${x.orgId}`;
      groups.set(who, [...(groups.get(who) ?? []), x]);
    }

    for (const [who, group] of groups) {
      const to = who.startsWith("user:") ? await emailsOf(db, [who.slice(5)]) : await managerEmails(db, who.slice(4));
      const email = group.length === 1 ? onePostFailed(group[0]) : manyPostsFailed(group);
      const ok = await sendEmail({ ...email, to }, `posts-failed:${group.map((x) => x.key).sort().join(",")}`.slice(0, 256));
      if (!ok) await releaseKeys(group.map((x) => x.key));
    }
  });
}

function failedRows(failed: FailedTarget[]) {
  return failed.map((t) => {
    const name = `${label(t.channels?.platform)}${t.channels?.handle ? ` (${t.channels.handle})` : ""}`;
    const why = explainPostError(t.error, t.channels?.platform).text;
    return { html: `<strong>${esc(name)}</strong><br><span style="color:#6b7079;">${esc(why)}</span>`, text: `${name}: ${why}` };
  });
}

function onePostFailed(x: { body: string | null; failed: FailedTarget[]; delivered: number }) {
  const where = x.failed.length === 1 ? label(x.failed[0].channels?.platform) : `${x.failed.length} channels`;
  const quote = excerpt(x.body);
  return layout({
    subject: `Your post didn't go out on ${where}`,
    preheader: quote,
    heading: x.delivered ? "Your post didn't go out everywhere" : "Your post didn't go out",
    blocks: [
      p(`&ldquo;${esc(quote)}&rdquo;`, `"${quote}"`, true),
      p(
        x.delivered ? `It published on ${x.delivered} channel${x.delivered === 1 ? "" : "s"}, but not on these:` : "It couldn't be published on:",
        x.delivered ? `It published on ${x.delivered} channel(s), but not on these:` : "It couldn't be published on:",
      ),
      list(failedRows(x.failed)),
      p("Open the queue to see the details and retry.", "Open the queue to see the details and retry."),
    ],
    cta: { label: "Open the queue", url: `${APP_URL}/queue` },
  });
}

function manyPostsFailed(group: { body: string | null; failed: FailedTarget[] }[]) {
  const shown = group.slice(0, 10);
  const more = group.length - shown.length;
  return layout({
    subject: `${group.length} of your posts didn't go out`,
    preheader: `${group.length} scheduled posts failed. Open the queue to retry them.`,
    heading: `${group.length} posts didn't go out`,
    blocks: [
      list(
        shown.map((x) => {
          const quote = excerpt(x.body, 80);
          const why = failedRows(x.failed);
          return {
            html: `&ldquo;${esc(quote)}&rdquo;<br>${why.map((w) => `<span style="color:#6b7079;font-size:13px;">${w.html}</span>`).join("<br>")}`,
            text: `"${quote}"\n  ${why.map((w) => w.text).join("\n  ")}`,
          };
        }),
      ),
      ...(more > 0 ? [p(`And ${more} more in the queue.`, `And ${more} more in the queue.`, true)] : []),
      p("Open the queue to see the details and retry.", "Open the queue to see the details and retry."),
    ],
    cta: { label: "Open the queue", url: `${APP_URL}/queue` },
  });
}

/** A channel was just flagged as needing a reconnect. */
export function notifyReconnect(channelId: string): Promise<void> {
  return guard(`reconnect ${channelId}`, async () => {
    const db = createAdminClient();
    const { data: ch } = await db
      .from("channels")
      .select("id, org_id, platform, handle, status, status_error, status_at")
      .eq("id", channelId)
      .maybeSingle();
    if (!ch || ch.status !== "reconnect") return;
    const { count } = await db
      .from("post_targets")
      .select("id, posts!inner(status)", { count: "exact", head: true })
      .eq("channel_id", channelId)
      .in("status", ["scheduled", "failed"])
      .in("posts.status", ["scheduled", "publishing", "failed"]);
    const name = `${label(ch.platform)}${ch.handle ? ` (${ch.handle})` : ""}`;
    const waiting = count ?? 0;
    const why = reconnectReason(ch.status_error, label(ch.platform));
    const email = layout({
      subject: `Reconnect ${label(ch.platform)} to keep posting`,
      preheader: `${name} stopped accepting posts from Postbase.`,
      heading: `Reconnect ${name}`,
      blocks: [
        p(esc(why), why),
        ...(waiting
          ? [p(`<strong>${waiting} post${waiting === 1 ? " is" : "s are"} waiting</strong> on this account and won't go out until it's reconnected.`, `${waiting} post(s) are waiting on this account and won't go out until it's reconnected.`)]
          : []),
        p("Reconnecting takes a few seconds and keeps your scheduled posts as they are.", "Reconnecting takes a few seconds and keeps your scheduled posts as they are."),
      ],
      cta: { label: `Reconnect ${label(ch.platform)}`, url: `${APP_URL}/channels` },
    });
    await sendEmailOnce(`reconnect:${channelId}:${ch.status_at ?? "na"}`, { ...email, to: await managerEmails(db, ch.org_id) });
  });
}

/** Email an invite link to the invited address. */
export function sendInviteEmail(invite: { id: string; email: string; token: string; role: string; orgName: string; inviter: string | null }): Promise<void> {
  return guard(`invite ${invite.id}`, async () => {
    const who = invite.inviter || "A teammate";
    const role = invite.role === "admin" ? "an admin" : "a member";
    const email = layout({
      subject: `${who} invited you to ${invite.orgName} on Postbase`,
      preheader: `Join ${invite.orgName} on Postbase.`,
      heading: `Join ${invite.orgName} on Postbase`,
      blocks: [
        p(`${esc(who)} invited you to join <strong>${esc(invite.orgName)}</strong> as ${role}. Postbase schedules posts to every social network from one calendar, or from your AI assistant.`,
          `${who} invited you to join ${invite.orgName} as ${role}. Postbase schedules posts to every social network from one calendar, or from your AI assistant.`),
        p(`Sign in with <strong>${esc(invite.email)}</strong> to accept.`, `Sign in with ${invite.email} to accept.`, true),
      ],
      cta: { label: "Accept the invite", url: `${APP_URL}/invite/${encodeURIComponent(invite.token)}` },
      footnote: "If you weren't expecting this, you can ignore it.",
    });
    await sendEmailOnce(`invite:${invite.id}`, { ...email, to: [invite.email] });
  });
}

/** First sign-in. */
export function sendWelcome(user: { id: string; email: string | null | undefined }): Promise<void> {
  return guard(`welcome ${user.id}`, async () => {
    if (!user.email) return;
    const email = layout({
      subject: "Welcome to Postbase",
      preheader: "Three steps to your first scheduled post.",
      heading: "Welcome to Postbase",
      blocks: [
        p("You're in. Three steps to your first scheduled post:", "You're in. Three steps to your first scheduled post:"),
        list([
          { html: "<strong>1. Connect a channel.</strong> X, LinkedIn, YouTube, TikTok, Bluesky or Mastodon.", text: "1. Connect a channel: X, LinkedIn, YouTube, TikTok, Bluesky or Mastodon." },
          { html: "<strong>2. Write and schedule.</strong> One post, every network, each with its own tweaks.", text: "2. Write and schedule: one post, every network, each with its own tweaks." },
          { html: "<strong>3. Or ask your AI.</strong> Connect Claude or ChatGPT on the Developers page and schedule from chat.", text: "3. Or ask your AI: connect Claude or ChatGPT on the Developers page and schedule from chat." },
        ]),
        p("Questions? Just reply to this email.", "Questions? Just reply to this email.", true),
      ],
      cta: { label: "Connect your first channel", url: `${APP_URL}/channels` },
    });
    await sendEmailOnce(`welcome:${user.id}`, { ...email, to: [user.email] });
  });
}

// ── Billing ─────────────────────────────────────────────────────────────────

async function orgForCustomer(db: Db, customer: string | Stripe.Customer | Stripe.DeletedCustomer | null, orgId?: string | null) {
  const q = db.from("orgs").select("id, name");
  if (orgId) return (await q.eq("id", orgId).maybeSingle()).data;
  const id = typeof customer === "string" ? customer : customer?.id;
  if (!id) return null;
  return (await q.eq("stripe_customer_id", id).maybeSingle()).data;
}

const money = (amount: number | null | undefined, currency: string | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: (currency ?? "usd").toUpperCase() }).format((amount ?? 0) / 100);
const day = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;

export function notifyPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  return guard(`payment-failed ${invoice.id}`, async () => {
    const db = createAdminClient();
    const org = await orgForCustomer(db, invoice.customer);
    if (!org) return;
    const next = day(invoice.next_payment_attempt);
    const amount = money(invoice.amount_due, invoice.currency);
    const email = layout({
      subject: "Your Postbase payment didn't go through",
      preheader: `We couldn't charge ${amount} for ${org.name}.`,
      heading: "Your payment didn't go through",
      blocks: [
        p(`We couldn't charge <strong>${esc(amount)}</strong> for <strong>${esc(org.name)}</strong>'s Postbase plan.`, `We couldn't charge ${amount} for ${org.name}'s Postbase plan.`),
        p(
          next
            ? `We'll try again on ${esc(next)}. Update your card before then to keep your scheduled posts going out.`
            : "Update your card to keep your scheduled posts going out.",
          next ? `We'll try again on ${next}. Update your card before then to keep your scheduled posts going out.` : "Update your card to keep your scheduled posts going out.",
        ),
      ],
      cta: { label: "Update payment method", url: `${APP_URL}/billing` },
    });
    await sendEmailOnce(`payment-failed:${invoice.id}:${invoice.attempt_count ?? 0}`, { ...email, to: await managerEmails(db, org.id) });
  });
}

export function notifyTrialEnding(sub: Stripe.Subscription): Promise<void> {
  return guard(`trial-ending ${sub.id}`, async () => {
    if (!sub.trial_end || sub.status !== "trialing" || sub.cancel_at_period_end) return;
    const db = createAdminClient();
    const org = await orgForCustomer(db, sub.customer, sub.metadata?.org_id);
    if (!org) return;
    const price = sub.items.data[0]?.price;
    const planId = planForPrice(price?.id);
    const planName = planId ? PLANS[planId].name : "Postbase";
    const amount = money(price?.unit_amount, price?.currency);
    const per = price?.recurring?.interval === "year" ? "year" : "month";
    const ends = day(sub.trial_end)!;
    const email = layout({
      subject: `Your Postbase trial ends on ${ends}`,
      preheader: `Your ${planName} plan starts then at ${amount}/${per}.`,
      heading: "Your free trial is ending soon",
      blocks: [
        p(`<strong>${esc(org.name)}</strong>'s trial ends on <strong>${esc(ends)}</strong>. Your ${esc(planName)} plan then starts at ${esc(amount)}/${per}, charged to the card you added.`,
          `${org.name}'s trial ends on ${ends}. Your ${planName} plan then starts at ${amount}/${per}, charged to the card you added.`),
        p("Nothing to do if you're staying. To change plans or cancel, use Billing before then.", "Nothing to do if you're staying. To change plans or cancel, use Billing before then.", true),
      ],
      cta: { label: "Manage billing", url: `${APP_URL}/billing` },
    });
    await sendEmailOnce(`trial-ending:${sub.id}:${sub.trial_end}`, { ...email, to: await managerEmails(db, org.id) });
  });
}

export function notifySubscriptionEnded(sub: Stripe.Subscription): Promise<void> {
  return guard(`sub-ended ${sub.id}`, async () => {
    const db = createAdminClient();
    const org = await orgForCustomer(db, sub.customer, sub.metadata?.org_id);
    if (!org) return;
    const email = layout({
      subject: "Your Postbase plan has ended",
      preheader: `Scheduled posts for ${org.name} are paused.`,
      heading: "Your plan has ended",
      blocks: [
        p(`<strong>${esc(org.name)}</strong>'s Postbase plan has ended, so scheduled posts won't go out. Your posts, drafts and channels are kept.`,
          `${org.name}'s Postbase plan has ended, so scheduled posts won't go out. Your posts, drafts and channels are kept.`),
        p("Pick a plan to start posting again.", "Pick a plan to start posting again."),
      ],
      cta: { label: "Choose a plan", url: `${APP_URL}/billing` },
    });
    await sendEmailOnce(`sub-ended:${sub.id}`, { ...email, to: await managerEmails(db, org.id) });
  });
}

/** Confirmation after self-serve account deletion (sent before nothing else exists for them). */
export function sendAccountDeleted(opts: { email: string; userId: string; workspaces: string[] }): Promise<void> {
  return guard(`account-deleted ${opts.userId}`, async () => {
    const list = opts.workspaces;
    const email = layout({
      subject: "Your Postbase account has been deleted",
      preheader: "Your account and data are gone.",
      heading: "Your account has been deleted",
      blocks: [
        p("Your Postbase account has been deleted, as you asked.", "Your Postbase account has been deleted, as you asked."),
        ...(list.length
          ? [
              p("These workspaces were deleted with it, including their posts, media and connected accounts:", "These workspaces were deleted with it, including their posts, media and connected accounts:"),
              listBlock(list.map((n) => ({ html: esc(n), text: n }))),
            ]
          : []),
        p(
          "Any subscription was cancelled and Postbase's access to your social accounts was revoked. Stripe keeps the billing records it's required to by law. Backups roll off within 90 days.",
          "Any subscription was cancelled and Postbase's access to your social accounts was revoked. Stripe keeps the billing records it's required to by law. Backups roll off within 90 days.",
          true,
        ),
        p("If you didn't do this, reply to this email straight away.", "If you didn't do this, reply to this email straight away.", true),
      ],
    });
    await sendEmailOnce(`account-deleted:${opts.userId}`, { ...email, to: [opts.email] });
  });
}
