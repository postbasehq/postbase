import { createAdminClient } from "@/lib/supabase/admin";
import { NO_PLAN_MESSAGE } from "@/lib/billing-guard";
import { sendEmailOnce } from "@/lib/email/send";
import { esc, layout, list, p } from "@/lib/email/templates";

/*
 * Is publishing working? Two independent signals:
 *  - Healthchecks.io heartbeat (HEALTHCHECK_PUBLISH_URL): pinged by every
 *    publish cron run, /fail when a run crashes. If the pings stop (cron not
 *    running at all) Healthchecks emails you. That's the one thing an in-app
 *    check can't catch.
 *  - checkPublishingHealth(): run at the end of each cron run; emails
 *    OPS_ALERT_EMAIL (default team@postbase.so) at most once an hour per
 *    problem when posts pile up overdue or most sends are failing.
 */

export async function pingHealthcheck(outcome: "ok" | "fail", detail?: string): Promise<void> {
  const url = process.env.HEALTHCHECK_PUBLISH_URL;
  if (!url) return;
  try {
    await fetch(outcome === "fail" ? `${url.replace(/\/+$/, "")}/fail` : url, {
      method: "POST",
      body: (detail ?? "").slice(0, 10_000),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // A monitoring hiccup must never affect publishing.
  }
}

const BACKLOG_AFTER_MS = 15 * 60_000; // due this long ago and still not sent
const FAILURE_MIN = 10; // sends in the last hour before a failure rate means anything
const FAILURE_RATE = 0.5;

export async function checkPublishingHealth(): Promise<void> {
  try {
    const db = createAdminClient();
    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60_000).toISOString();
    const backlogBefore = new Date(now - BACKLOG_AFTER_MS).toISOString();
    const [overdue, stuckTargets, attempts, failures] = await Promise.all([
      // Due posts the runner should have picked up already.
      db.from("posts").select("id", { count: "exact", head: true }).eq("status", "scheduled").lt("scheduled_at", backlogBefore),
      // Targets of posts that started publishing a while ago but never got sent.
      db
        .from("post_targets")
        .select("id, posts!inner(status, scheduled_at)", { count: "exact", head: true })
        .eq("status", "scheduled")
        .eq("posts.status", "publishing")
        .lt("posts.scheduled_at", backlogBefore),
      db.from("post_targets").select("id", { count: "exact", head: true }).gte("claimed_at", hourAgo),
      // Failures in the last hour, minus the expected ones (a lapsed plan).
      db
        .from("post_targets")
        .select("error, channels(platform)")
        .eq("status", "failed")
        .gte("claimed_at", hourAgo)
        .neq("error", NO_PLAN_MESSAGE)
        .limit(500),
    ]);

    const hour = new Date(now).toISOString().slice(0, 13);
    const backlog = (overdue.count ?? 0) + (stuckTargets.count ?? 0);
    if (backlog > 0) {
      await alert(`ops:backlog:${hour}`, "Postbase: posts are piling up unsent", [
        p(`<strong>${backlog}</strong> post(s)/send(s) were due more than 15 minutes ago and haven't gone out.`, `${backlog} post(s)/send(s) were due more than 15 minutes ago and haven't gone out.`),
        p("The publish cron is running but not getting through its queue. Check the Vercel logs for /api/cron/publish.", "The publish cron is running but not getting through its queue. Check the Vercel logs for /api/cron/publish."),
      ]);
    }

    const failed = failures.data ?? [];
    const tried = attempts.count ?? 0;
    if (failed.length >= FAILURE_MIN && tried > 0 && failed.length / tried >= FAILURE_RATE) {
      const byError = new Map<string, number>();
      for (const f of failed) {
        const platform = (f.channels as unknown as { platform?: string } | null)?.platform ?? "?";
        const k = `${platform}: ${String(f.error ?? "").slice(0, 140)}`;
        byError.set(k, (byError.get(k) ?? 0) + 1);
      }
      const top = [...byError.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      await alert(`ops:failures:${hour}`, `Postbase: ${failed.length} of ${tried} sends failed in the last hour`, [
        p(`<strong>${failed.length}</strong> of ${tried} sends in the last hour failed (lapsed-plan failures excluded). Most common:`, `${failed.length} of ${tried} sends in the last hour failed. Most common:`),
        list(top.map(([k, n]) => ({ html: `${n}× ${esc(k)}`, text: `${n}x ${k}` }))),
      ]);
    }
  } catch (e) {
    console.error("[health] check failed:", e instanceof Error ? e.message : e);
  }
}

async function alert(key: string, subject: string, blocks: ReturnType<typeof p>[]) {
  const email = layout({ subject, preheader: subject, heading: subject.replace(/^Postbase: /, ""), blocks });
  await sendEmailOnce(key, { ...email, to: [process.env.OPS_ALERT_EMAIL || "team@postbase.so"] });
}
