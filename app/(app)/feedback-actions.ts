"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId, getUserOrgs } from "@/lib/org";
import { rateLimit } from "@/lib/rate-limit";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import {
  buildFeedbackEmail,
  FEEDBACK_KINDS,
  FEEDBACK_MAX_CHARS,
  FEEDBACK_MAX_SCREENSHOT_BYTES,
  type FeedbackKind,
} from "@/lib/email/feedback";

export type FeedbackState = { ok: true } | { ok: false; error: string } | null;

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** The sidebar Feedback form: emails the team inbox, Reply-To the sender. */
export async function sendFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Please sign in again to send feedback." };

  const rawKind = String(formData.get("kind") ?? "bug");
  const kind: FeedbackKind = rawKind in FEEDBACK_KINDS ? (rawKind as FeedbackKind) : "other";
  const message = String(formData.get("message") ?? "").trim();
  if (message.length < 5) return { ok: false, error: "Tell us a little more so we can help." };
  if (message.length > FEEDBACK_MAX_CHARS) {
    return { ok: false, error: `Please keep it under ${FEEDBACK_MAX_CHARS.toLocaleString()} characters.` };
  }

  let screenshot: { filename: string; base64: string } | null = null;
  const file = formData.get("screenshot");
  if (file instanceof File && file.size > 0) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return { ok: false, error: "Screenshots must be PNG, JPEG or WebP." };
    if (file.size > FEEDBACK_MAX_SCREENSHOT_BYTES) return { ok: false, error: "That screenshot is too large." };
    screenshot = { filename: `screenshot.${ext}`, base64: Buffer.from(await file.arrayBuffer()).toString("base64") };
  }

  if (!emailConfigured()) {
    return { ok: false, error: "Feedback isn’t available right now. Email team@postbase.so instead." };
  }
  if (!(await rateLimit(`feedback:${user.id}`, 60 * 60, 10))) {
    return { ok: false, error: "You’ve sent a lot of feedback this hour. Please try again later." };
  }

  const [orgId, orgs] = await Promise.all([getCurrentOrgId(), getUserOrgs()]);
  const org = orgs.find((o) => o.id === orgId) ?? null;
  const page = String(formData.get("page") ?? "").slice(0, 500) || null;
  const userAgent = String(formData.get("userAgent") ?? "").slice(0, 300) || null;

  const ok = await sendEmail(
    buildFeedbackEmail({
      kind,
      message,
      page,
      userAgent,
      sender: { id: user.id, email: user.email },
      workspace: org ? { id: org.id, name: org.name } : null,
      screenshot,
    }),
    `feedback:${user.id}:${Date.now()}`,
  );
  if (!ok) return { ok: false, error: "We couldn’t send that. Please try again, or email team@postbase.so." };
  return { ok: true };
}
