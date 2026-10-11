/*
 * Where an app's sign-in (via Composio) lands. Connecting opens in a popup:
 * tell the Postbots window and close. Without a popup (blocked, or a phone
 * that opened a tab), go back to Postbots.
 */

export const runtime = "nodejs";

export function GET(req: Request) {
  const url = new URL(req.url);
  const app = (url.searchParams.get("app") ?? "").replace(/[^a-z0-9_]/g, "");
  const ok = (url.searchParams.get("status") ?? "success") !== "failed";
  const message = JSON.stringify({ type: "postbots-app", app, ok });
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Postbots</title>
<body style="font:15px system-ui;background:#202124;color:#e8eaed;display:grid;place-items:center;height:100vh;margin:0">
<p>${ok ? "Connected. You can close this window." : "That didn't connect. Close this window and try again."}</p>
<script>
try { if (window.opener) { window.opener.postMessage(${message}, location.origin); window.close(); } else { location.replace("/bots"); } } catch (e) { location.replace("/bots"); }
</script>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
