import { getCurrentOrgId } from "@/lib/org";
import { appsEnabled, createConnectLink, disconnectApp, isAppSlug, listConnections } from "@/lib/postbots/apps";

/*
 * The workspace's app connections for Postbots (lib/postbots/apps.ts).
 *   GET     which apps are connected
 *   POST    { slug } → a sign-in link for that app
 *   DELETE  { slug } → disconnect it
 */

export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function slugFrom(req: Request): Promise<string | null> {
  try {
    const body = (await req.json()) as { slug?: unknown };
    return isAppSlug(body.slug) ? body.slug : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const orgId = await getCurrentOrgId();
  if (!orgId) return json({ error: "Sign in again." }, 401);
  if (!appsEnabled()) return json({ enabled: false, connections: [] });
  try {
    const all = await listConnections(orgId);
    return json({ enabled: true, connections: all.map((a) => ({ slug: a.slug, status: a.status })) });
  } catch (e) {
    console.error("[postbots] list apps", e);
    return json({ error: "Couldn't load your apps. Try again in a moment." }, 502);
  }
}

export async function POST(req: Request) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return json({ error: "Sign in again." }, 401);
  if (!appsEnabled()) return json({ error: "Apps aren't switched on yet." }, 503);
  const slug = await slugFrom(req);
  if (!slug) return json({ error: "Unknown app." }, 400);
  try {
    const url = await createConnectLink(orgId, slug, `${new URL(req.url).origin}/api/bots/apps/callback?app=${slug}`);
    return json({ url });
  } catch (e) {
    console.error("[postbots] connect app", slug, e);
    return json({ error: "Couldn't start connecting. Try again in a moment." }, 502);
  }
}

export async function DELETE(req: Request) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return json({ error: "Sign in again." }, 401);
  if (!appsEnabled()) return json({ error: "Apps aren't switched on yet." }, 503);
  const slug = await slugFrom(req);
  if (!slug) return json({ error: "Unknown app." }, 400);
  try {
    await disconnectApp(orgId, slug);
    return json({ ok: true });
  } catch (e) {
    console.error("[postbots] disconnect app", slug, e);
    return json({ error: "Couldn't disconnect. Try again in a moment." }, 502);
  }
}
