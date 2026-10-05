import type { Email } from "@/lib/email/send";

/*
 * Branded transactional emails, matching the Supabase auth templates in
 * supabase/templates/. Every dynamic value goes through esc(): post text,
 * handles, workspace and people's names are all user-controlled.
 */

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.postbase.so").replace(/\/+$/, "");

export function esc(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A short single-line excerpt of a post for context. */
export function excerpt(body: string | null | undefined, max = 120): string {
  const flat = (body ?? "").replace(/\s+/g, " ").trim();
  const chars = Array.from(flat);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : flat;
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

type Block = { html: string; text: string };

/** A paragraph. Pass already-escaped HTML; `text` is the plain version. */
export function p(html: string, text: string, muted = false): Block {
  const color = muted ? "#6b7079" : "#4a4f57";
  const size = muted ? 13 : 15;
  return { html: `<p style="margin:0 0 16px 0;font-size:${size}px;line-height:1.6;color:${color};">${html}</p>`, text };
}

/** A grey inset list of rows (already-escaped HTML per row). */
export function list(rows: { html: string; text: string }[]): Block {
  const items = rows
    .map((r) => `<tr><td style="padding:8px 14px;font-size:14px;line-height:1.5;color:#14161a;border-top:1px solid #e4e6eb;">${r.html}</td></tr>`)
    .join("")
    .replace("border-top:1px solid #e4e6eb;", "");
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#f4f5f7;border-radius:12px;">${items}</table>`,
    text: rows.map((r) => `- ${r.text}`).join("\n"),
  };
}

export function layout(opts: {
  subject: string;
  preheader: string;
  heading: string;
  blocks: Block[];
  cta?: { label: string; url: string };
  footnote?: string;
}): Email & { to: [] } {
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px 0;"><tr><td style="border-radius:999px;background:#2b59d9;">
          <a href="${esc(opts.cta.url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(opts.cta.label)}</a>
        </td></tr></table>`
    : "";
  const footnote = opts.footnote
    ? `<p style="margin:20px 0 0 0;font-size:12px;line-height:1.6;color:#8a8f98;">${esc(opts.footnote)}</p>`
    : "";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e6eb;border-radius:16px;">
      <tr><td style="padding:32px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;"><img src="https://www.postbase.so/icon-192.png" width="32" height="32" alt="" style="display:block;border-radius:8px;"></td>
          <td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:18px;font-weight:700;color:#14161a;">Postbase</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px 32px 8px 32px;font-family:${FONT};">
        <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.3;font-weight:700;color:#14161a;">${esc(opts.heading)}</h1>
        ${opts.blocks.map((b) => b.html).join("\n        ")}
        ${cta}
        ${footnote}
      </td></tr>
      <tr><td style="padding:24px 32px 32px 32px;">
        <hr style="border:none;border-top:1px solid #e4e6eb;margin:0 0 16px 0;">
        <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:#8a8f98;">Postbase &middot; Schedule posts everywhere, from one calendar or your AI.<br>Berkway Group Limited, 3rd Floor, 86-90 Paul Street, London, EC2A 4NE</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  const text = [
    opts.heading,
    "",
    ...opts.blocks.map((b) => b.text),
    ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []),
    ...(opts.footnote ? ["", opts.footnote] : []),
    "",
    "--",
    "Postbase · Berkway Group Limited, 3rd Floor, 86-90 Paul Street, London, EC2A 4NE",
  ].join("\n");
  return { to: [], subject: opts.subject, html, text };
}
