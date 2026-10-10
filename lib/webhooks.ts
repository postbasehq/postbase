import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { postPublic, resolvesPublic, urlProblem } from "@/lib/safe-fetch";

/*
 * Webhooks: signed POSTs to a workspace's own https endpoints when its posts
 * finish publishing or a channel needs reconnecting. Each event is stored per
 * endpoint (webhook_deliveries) and sent at once; failures are retried with
 * backoff by the publish cron (deliverDueWebhooks). Tables are service-role
 * only (migration 0067), so every query here filters by org_id.
 *
 * Signature: HMAC-SHA256 of `${timestamp}.${body}` with the endpoint's secret,
 * sent as `Postbase-Signature: sha256=<hex>` next to `Postbase-Timestamp`.
 */

type Db = ReturnType<typeof createAdminClient>;

export const WEBHOOK_EVENTS = ["post.published", "post.partial", "post.failed", "channel.needs_reconnect"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  "post.published": "Published on every channel",
  "post.partial": "Published on some channels, failed on others",
  "post.failed": "Failed on every channel",
  "channel.needs_reconnect": "A channel lost access and needs reconnecting",
};
export const MAX_ENDPOINTS = 10;
/** Minutes to wait after each failed attempt; one first try plus these retries. */
export const RETRY_MINUTES = [1, 5, 30, 120, 360];
const TIMEOUT_MS = 10_000;

export const newSecret = () => `whsec_${crypto.randomBytes(24).toString("base64url")}`;

/** The Postbase-Signature header value for a body sent at `timestamp` (Unix seconds). */
export function signPayload(secret: string, timestamp: number, body: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export type EndpointSummary = {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  secret_hint: string;
  created_at: string;
  created_by: string | null;
  last_delivery: { status: string; response_status: number | null; error: string | null; created_at: string } | null;
};

/** Why `events` isn't a usable subscription, or null. */
function eventsProblem(events: string[]): string | null {
  if (events.length === 0) return "Choose at least one event";
  const bad = events.find((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e));
  return bad ? `Unknown event "${bad}". Use: ${WEBHOOK_EVENTS.join(", ")}` : null;
}

export async function listEndpoints(orgId: string): Promise<EndpointSummary[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("webhook_endpoints")
    .select("id, url, events, description, secret_hint, created_at, created_by")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  const endpoints = data ?? [];
  if (endpoints.length === 0) return [];
  const last = await Promise.all(
    endpoints.map((e) =>
      db
        .from("webhook_deliveries")
        .select("status, response_status, error, created_at")
        .eq("endpoint_id", e.id)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => r.data ?? null),
    ),
  );
  return endpoints.map((e, i) => ({ ...(e as Omit<EndpointSummary, "last_delivery">), last_delivery: last[i] }));
}

/** Register an endpoint. The secret is returned here only; afterwards just its hint. */
export async function createEndpoint(
  orgId: string,
  input: { url: string; events: string[]; description?: string | null; createdBy?: string | null },
): Promise<{ endpoint: Omit<EndpointSummary, "last_delivery">; secret: string }> {
  const url = input.url.trim();
  const problem = urlProblem(url);
  if (problem) throw new Error(`The webhook URL ${problem}.`);
  const events = [...new Set(input.events)];
  const evProblem = eventsProblem(events);
  if (evProblem) throw new Error(evProblem);

  const db = createAdminClient();
  const { count } = await db.from("webhook_endpoints").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if ((count ?? 0) >= MAX_ENDPOINTS) throw new Error(`A workspace can have up to ${MAX_ENDPOINTS} webhook endpoints.`);
  if (!(await resolvesPublic(url))) throw new Error("The webhook URL's host doesn't resolve to a public address.");

  const secret = newSecret();
  const { data, error } = await db
    .from("webhook_endpoints")
    .insert({
      org_id: orgId,
      url,
      encrypted_secret: encryptJson(secret),
      secret_hint: `whsec_…${secret.slice(-4)}`,
      events,
      description: input.description?.trim().slice(0, 200) || null,
      created_by: input.createdBy ?? null,
    })
    .select("id, url, events, description, secret_hint, created_at, created_by")
    .single();
  if (error || !data) throw new Error("Couldn't save the webhook endpoint.");
  return { endpoint: data as Omit<EndpointSummary, "last_delivery">, secret };
}

export async function getEndpoint(orgId: string, id: string) {
  const { data } = await createAdminClient()
    .from("webhook_endpoints")
    .select("id, url, events, encrypted_secret, created_by")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  return data;
}

export async function deleteEndpoint(orgId: string, id: string): Promise<boolean> {
  const { data } = await createAdminClient().from("webhook_endpoints").delete().eq("id", id).eq("org_id", orgId).select("id");
  return (data?.length ?? 0) > 0;
}

export async function listDeliveries(orgId: string, endpointId: string, limit = 20) {
  const { data } = await createAdminClient()
    .from("webhook_deliveries")
    .select("id, event_id, event_type, status, attempts, response_status, error, next_attempt_at, created_at, delivered_at")
    .eq("endpoint_id", endpointId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  return data ?? [];
}

type DeliveryRow = {
  id: string;
  endpoint_id: string;
  org_id: string;
  event_id: string;
  event_type: string;
  payload: unknown;
  attempts: number;
};

/** Send one delivery and record the outcome (delivered, retry later, or failed for good). */
async function attempt(db: Db, row: DeliveryRow, endpoint: { url: string; encrypted_secret: string }): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  const body = JSON.stringify(row.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  let status: number | null = null;
  let error: string | null = null;
  try {
    const secret = decryptJson<string>(endpoint.encrypted_secret);
    const res = await postPublic(
      endpoint.url,
      body,
      {
        "content-type": "application/json",
        "user-agent": "Postbase-Webhooks/1.0",
        "postbase-event-id": row.event_id,
        "postbase-event-type": row.event_type,
        "postbase-timestamp": String(timestamp),
        "postbase-signature": signPayload(secret, timestamp, body),
      },
      TIMEOUT_MS,
    );
    status = res.status;
    if (status < 200 || status >= 300) error = `HTTP ${status}${res.body ? `: ${res.body.slice(0, 200)}` : ""}`;
  } catch (e) {
    error = e instanceof Error ? e.message : "Delivery failed";
  }

  const attempts = row.attempts + 1;
  const ok = error === null;
  const retryIn = RETRY_MINUTES[attempts - 1];
  await db
    .from("webhook_deliveries")
    .update(
      ok
        ? { status: "delivered", attempts, response_status: status, error: null, delivered_at: new Date().toISOString() }
        : retryIn !== undefined
          ? { status: "pending", attempts, response_status: status, error, next_attempt_at: new Date(Date.now() + retryIn * 60_000).toISOString() }
          : { status: "failed", attempts, response_status: status, error },
    )
    .eq("id", row.id);
  return { ok, status, error };
}

/**
 * Queue an event for every endpoint in the workspace subscribed to it, and try
 * each delivery straight away. `dedupeKey` identifies the outcome: an endpoint
 * never gets the same key twice. Never throws (webhooks mustn't break publishing).
 */
export async function emitEvent(orgId: string, type: WebhookEvent, data: Record<string, unknown>, dedupeKey: string): Promise<number> {
  try {
    const db = createAdminClient();
    const { data: endpoints } = await db
      .from("webhook_endpoints")
      .select("id, url, encrypted_secret")
      .eq("org_id", orgId)
      .contains("events", [type]);
    if (!endpoints?.length) return 0;

    const eventId = crypto.randomUUID();
    const payload = { id: eventId, type, created_at: new Date().toISOString(), workspace_id: orgId, data };
    const { data: rows } = await db
      .from("webhook_deliveries")
      .upsert(
        endpoints.map((e) => ({ endpoint_id: e.id, org_id: orgId, event_id: eventId, event_type: type, dedupe_key: dedupeKey, payload })),
        { onConflict: "endpoint_id,dedupe_key", ignoreDuplicates: true },
      )
      .select("id, endpoint_id, org_id, event_id, event_type, payload, attempts");
    const byId = new Map(endpoints.map((e) => [e.id as string, e]));
    await Promise.allSettled(((rows ?? []) as DeliveryRow[]).map((r) => attempt(db, r, byId.get(r.endpoint_id)!)));
    return rows?.length ?? 0;
  } catch (e) {
    console.error(`[webhooks] ${type} for ${orgId} not queued:`, e);
    return 0;
  }
}

/**
 * Retry deliveries that are due (called from the publish cron). Each is leased
 * first, by pushing its next attempt out, so overlapping runs never send it twice.
 */
export async function deliverDueWebhooks(limit = 50): Promise<number> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const { data: due } = await db
    .from("webhook_deliveries")
    .select("id, endpoint_id, org_id, event_id, event_type, payload, attempts, next_attempt_at")
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(limit);
  let sent = 0;
  await Promise.allSettled(
    ((due ?? []) as (DeliveryRow & { next_attempt_at: string })[]).map(async (row) => {
      const { data: leased } = await db
        .from("webhook_deliveries")
        .update({ next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString() })
        .eq("id", row.id)
        .eq("status", "pending")
        .eq("attempts", row.attempts)
        .eq("next_attempt_at", row.next_attempt_at)
        .select("id");
      if (!leased?.length) return;
      const { data: endpoint } = await db
        .from("webhook_endpoints")
        .select("url, encrypted_secret")
        .eq("id", row.endpoint_id)
        .eq("org_id", row.org_id)
        .maybeSingle();
      if (!endpoint) return; // deleted: its deliveries cascade away
      await attempt(db, row, endpoint);
      sent++;
    }),
  );
  return sent;
}

/** Send a `webhook.test` event to one endpoint now, and report how it went. Not retried. */
export async function sendTestEvent(orgId: string, endpointId: string) {
  const endpoint = await getEndpoint(orgId, endpointId);
  if (!endpoint) return null;
  const db = createAdminClient();
  const eventId = crypto.randomUUID();
  const payload = {
    id: eventId,
    type: "webhook.test",
    created_at: new Date().toISOString(),
    workspace_id: orgId,
    data: { message: "A test event from Postbase. Your endpoint is receiving webhooks." },
  };
  const { data: row, error } = await db
    .from("webhook_deliveries")
    .insert({
      endpoint_id: endpointId,
      org_id: orgId,
      event_id: eventId,
      event_type: "webhook.test",
      dedupe_key: `test:${eventId}`,
      payload,
      // One try only: a test that fails is reported, not retried.
      attempts: RETRY_MINUTES.length,
    })
    .select("id, endpoint_id, org_id, event_id, event_type, payload, attempts")
    .single();
  if (error || !row) throw new Error("Couldn't send the test event.");
  const result = await attempt(db, row as DeliveryRow, endpoint);
  return { event_id: eventId, delivered: result.ok, response_status: result.status, error: result.error };
}

/** A short, stable fingerprint of a post's per-channel outcome, for dedupe keys. */
const fingerprint = (parts: string[]) => crypto.createHash("sha256").update(parts.sort().join("|")).digest("hex").slice(0, 16);

/**
 * After the publisher settles a post: post.published when every channel went
 * out, post.partial when some did and some failed, post.failed when none did.
 */
export async function emitPostOutcome(postId: string, status: string): Promise<void> {
  if (status !== "published" && status !== "failed") return;
  try {
    const db = createAdminClient();
    const { data: post } = await db.from("posts").select("org_id").eq("id", postId).maybeSingle();
    if (!post) return;
    const orgId = post.org_id as string;
    // Most workspaces have no webhooks: check before building the payload.
    const { count } = await db.from("webhook_endpoints").select("id", { count: "exact", head: true }).eq("org_id", orgId);
    if (!count) return;
    const { getPost } = await import("@/lib/api-core");
    const full = await getPost(orgId, postId);
    const type: WebhookEvent =
      status === "published" ? "post.published" : full.summary.published > 0 ? "post.partial" : "post.failed";
    const key = `${type}:${postId}:${fingerprint(full.channels.map((c) => `${c.channel_id}=${c.status}:${c.url ?? ""}:${c.error ?? ""}`))}`;
    await emitEvent(orgId, type, { post: full }, key);
  } catch (e) {
    console.error(`[webhooks] outcome of ${postId} not sent:`, e);
  }
}

/** A channel was just flagged as needing reconnecting (called from notifyReconnect). */
export async function emitChannelNeedsReconnect(channelId: string): Promise<void> {
  try {
    const db = createAdminClient();
    const { data: ch } = await db
      .from("channels")
      .select("id, org_id, platform, handle, status, status_error, status_at")
      .eq("id", channelId)
      .maybeSingle();
    if (!ch || ch.status !== "reconnect") return;
    const error = (ch.status_error as string | null) ?? "The connection needs to be renewed.";
    await emitEvent(
      ch.org_id as string,
      "channel.needs_reconnect",
      { channel: { id: ch.id, platform: ch.platform, handle: ch.handle, status: "reconnect", error } },
      `reconnect:${ch.id}:${ch.status_at ?? ""}`,
    );
  } catch (e) {
    console.error(`[webhooks] reconnect for ${channelId} not sent:`, e);
  }
}
