import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Transactional email through Resend's HTTP API (the postbase.so domain is
 * already verified there for the Supabase auth emails).
 *
 * Env: RESEND_API_KEY (no key = emails are skipped, nothing else changes),
 * optional EMAIL_FROM (default "Postbase <noreply@postbase.so>") and
 * EMAIL_REPLY_TO (default team@postbase.so).
 *
 * Never throws: an email problem must not break publishing, billing webhooks
 * or sign-in. Failures are logged.
 */

export type Email = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  /** Overrides EMAIL_REPLY_TO (e.g. feedback, so a reply goes to the sender). */
  replyTo?: string;
  /** Base64 file contents (Resend attachments). */
  attachments?: { filename: string; content: string }[];
};

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Record keys as sent; returns the ones this call claimed (not sent before). */
export async function claimKeys(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const { data, error } = await createAdminClient()
    .from("email_log")
    .upsert(keys.map((key) => ({ key })), { onConflict: "key", ignoreDuplicates: true })
    .select("key");
  if (error) {
    console.error(`[email] couldn't claim ${keys.length} key(s): ${error.message}`);
    return [];
  }
  return (data ?? []).map((r) => r.key as string);
}

/** Give keys back after a failed send, so a later trigger can try again. */
export async function releaseKeys(keys: string[]): Promise<void> {
  if (keys.length) await createAdminClient().from("email_log").delete().in("key", keys);
}

/** Send one email now (no dedupe). False on any failure; never throws. */
export async function sendEmail(email: Email, idempotencyKey: string): Promise<boolean> {
  const to = [...new Set(email.to.map((t) => t.trim().toLowerCase()).filter((t) => t.includes("@")))];
  if (!emailConfigured() || to.length === 0) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        // Resend also dedupes on this for 24h, in case our response is lost.
        "Idempotency-Key": idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Postbase <noreply@postbase.so>",
        reply_to: email.replyTo || process.env.EMAIL_REPLY_TO || "team@postbase.so",
        to,
        // Subjects carry workspace/people names: no control characters, sane length.
        subject: email.subject.replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, 200),
        html: email.html,
        text: email.text,
        ...(email.attachments?.length ? { attachments: email.attachments } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return true;
  } catch (e) {
    console.error(`[email] ${idempotencyKey} failed:`, e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Send once per `key`: the first caller to record the key sends; anyone else
 * (an overlapping cron run, a retried webhook) skips. If the send itself fails
 * the key is released so a later trigger can try again.
 */
export async function sendEmailOnce(key: string, email: Email): Promise<boolean> {
  if (!emailConfigured() || email.to.length === 0) return false;
  if ((await claimKeys([key])).length === 0) return false; // already sent
  const ok = await sendEmail(email, key);
  if (!ok) await releaseKeys([key]);
  return ok;
}
