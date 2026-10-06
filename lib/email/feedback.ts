import type { Email } from "@/lib/email/send";
import { esc, layout, list, p } from "@/lib/email/templates";

/*
 * In-app feedback (the sidebar's Feedback form) → the team inbox. Reply-To is
 * the sender, so answering the email answers them directly.
 */

export const FEEDBACK_TO = "team@postbase.so";
export const FEEDBACK_KINDS = { bug: "Bug report", idea: "Idea", other: "Feedback" } as const;
export type FeedbackKind = keyof typeof FEEDBACK_KINDS;

export const FEEDBACK_MAX_CHARS = 5000;
/** Screenshot cap after client-side downscaling (server actions take ~1MB bodies). */
export const FEEDBACK_MAX_SCREENSHOT_BYTES = 700 * 1024;

export type FeedbackInput = {
  kind: FeedbackKind;
  message: string;
  page: string | null;
  userAgent: string | null;
  sender: { id: string; email: string };
  workspace: { id: string; name: string } | null;
  screenshot: { filename: string; base64: string } | null;
};

export function buildFeedbackEmail(f: FeedbackInput): Email {
  const label = FEEDBACK_KINDS[f.kind];
  const firstLine = f.message.split("\n").find((l) => l.trim())?.trim() ?? "";
  const summary = Array.from(firstLine).length > 70 ? `${Array.from(firstLine).slice(0, 69).join("")}…` : firstLine;
  const subject = `[${label}] ${summary || "(no message)"}`;

  const meta = [
    { k: "From", v: f.sender.email },
    { k: "Workspace", v: f.workspace ? `${f.workspace.name} (${f.workspace.id})` : "None" },
    { k: "Page", v: f.page || "Unknown" },
    { k: "Browser", v: f.userAgent || "Unknown" },
    { k: "User ID", v: f.sender.id },
  ];

  const message = esc(f.message).replace(/\n/g, "<br>");
  const email = layout({
    subject,
    preheader: summary,
    heading: label,
    blocks: [
      p(message, f.message),
      list(meta.map((m) => ({ html: `<strong>${esc(m.k)}:</strong> ${esc(m.v)}`, text: `${m.k}: ${m.v}` }))),
      ...(f.screenshot ? [p("Screenshot attached.", "Screenshot attached.", true)] : []),
    ],
    footnote: "Reply to this email to answer the sender directly.",
  });

  return {
    ...email,
    to: [FEEDBACK_TO],
    replyTo: f.sender.email,
    attachments: f.screenshot ? [{ filename: f.screenshot.filename, content: f.screenshot.base64 }] : undefined,
  };
}
