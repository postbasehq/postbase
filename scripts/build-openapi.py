#!/usr/bin/env python3
"""
Writes docs/openapi.json: the OpenAPI 3.1 description of the Postbase REST API
(/api/v1). It feeds the docs' API reference and playground, is served at
/api/v1/openapi.json, and can generate client SDKs. Edit this script, not the
JSON, then run: python3 scripts/build-openapi.py
"""
import json, os

S = lambda t, **k: {"type": t, **k}
NS = lambda t="string", **k: {"type": [t, "null"], **k}
ref = lambda n: {"$ref": f"#/components/schemas/{n}"}
arr = lambda items, **k: {"type": "array", "items": items, **k}
obj = lambda props, req=None, **k: {"type": "object", "properties": props, **({"required": req} if req else {}), **k}

def body(schema, example=None):
    c = {"schema": schema}
    if example is not None:
        c["example"] = example
    return {"required": True, "content": {"application/json": c}}

def ok(desc, schema, code="200"):
    return {code: {"description": desc, "content": {"application/json": {"schema": schema}}}}

ERR = {"description": "Error", "content": {"application/json": {"schema": ref("Error")}}}
errs = lambda *codes: {str(c): {**ERR, "description": {400: "Invalid request", 401: "Missing or invalid API key", 402: "No active plan", 404: "Not found", 409: "Conflict with the post's state", 429: "Rate limited"}[c]} for c in codes}
pid = {"name": "id", "in": "path", "required": True, "schema": S("string", format="uuid")}

post_fields = {
    "body": S("string", description="The post text, for a single post."),
    "thread": arr(S("string"), description="Several posts to publish as a thread, in order. Takes precedence over body."),
    "channel_ids": arr(S("string", format="uuid"), description="Channels to publish to, from GET /channels."),
    "channel_bodies": {"type": "object", "additionalProperties": S("string"), "description": "Text for particular channels instead of body, keyed by channel id. Each is a single post."},
    "scheduled_at": NS(description="When to publish: ISO 8601 with Z or an offset (2026-10-01T09:00:00+01:00). Omit or null to save a draft.", format="date-time"),
    "schedule_in_minutes": S("number", description="Publish this many minutes from now, on the server's clock. Instead of scheduled_at."),
    "media_ids": arr(S("string", format="uuid"), description="Files from GET /media to attach, in order."),
    "media_urls": arr(S("string", format="uri"), description="Public https links to images or a video, attached after media_ids. Each is downloaded into the media library (up to 10 per request, 200 MB each).", maxItems=10),
    "youtube": obj({
        "title": S("string", maxLength=100),
        "privacy": S("string", enum=["public", "unlisted", "private"]),
        "made_for_kids": S("boolean", description="Required to schedule to YouTube."),
    }),
}

schemas = {
    "Error": obj({"error": S("string", description="A readable message"), "code": S("string", description="A stable code, e.g. not_found")}, ["error"]),
    "Channel": obj({"id": S("string", format="uuid"), "platform": S("string", enum=["x", "linkedin", "bluesky", "mastodon", "youtube", "tiktok", "instagram", "facebook"]), "handle": NS(), "status": S("string")}, ["id", "platform"]),
    "Media": obj({"id": S("string", format="uuid"), "name": S("string"), "type": S("string", description="MIME type"), "size_bytes": S("integer"), "url": S("string", format="uri"), "created_at": S("string", format="date-time")}, ["id", "url", "type"]),
    "PostSummary": obj({"id": S("string", format="uuid"), "body": S("string"), "scheduled_at": NS(format="date-time"), "status": S("string"), "post_targets": arr(obj({"channel_id": S("string"), "status": S("string")}))}),
    "CreatedPost": obj({
        "id": S("string", format="uuid"), "body": S("string"), "scheduled_at": NS(format="date-time"),
        "status": S("string", enum=["draft", "scheduled", "publishing", "published", "failed"]),
        "media": S("integer", description="How many files are attached"),
        "warning": S("string", description="Something to tell the user, such as X charging for links"),
        "idempotent_replay": S("boolean", description="True when this repeats an earlier request with the same idempotency key"),
    }, ["id", "status"]),
    "PostChannel": obj({
        "channel_id": S("string", format="uuid"), "platform": NS(), "handle": NS(),
        "status": S("string", enum=["draft", "scheduled", "publishing", "published", "failed"]),
        "url": NS(format="uri", description="The live post, once published"),
        "error": NS(description="Why it failed"),
        "warning": NS(description="It published, with something to know"),
        "retry_at": NS(format="date-time", description="When Postbase will retry a failed channel on its own"),
        "body": NS(description="This channel's own text, if any"),
        "metrics": {"type": ["object", "null"], "additionalProperties": S("number"), "description": "Latest likes, impressions, etc."},
    }, ["channel_id", "status"]),
    "Post": obj({
        "id": S("string", format="uuid"),
        "status": S("string", enum=["draft", "scheduled", "publishing", "published", "failed"]),
        "body": S("string"), "thread": arr(S("string")),
        "scheduled_at": NS(format="date-time"), "created_at": S("string", format="date-time"),
        "media": arr(obj({"url": S("string", format="uri"), "type": S("string")})),
        "channels": arr(ref("PostChannel")),
        "summary": obj({"published": S("integer"), "failed": S("integer"), "pending": S("integer")}),
        "warning": S("string"),
    }, ["id", "status", "channels"]),
    "Metrics": obj({"impressions": NS("number"), "likes": S("number"), "comments": S("number"), "shares": S("number"), "saves": S("number"), "engagement": S("number", description="likes + comments + shares + saves")}),
    "AnalyticsPost": obj({
        "post_id": S("string", format="uuid"), "body": S("string"), "published_at": S("string", format="date-time"),
        "channels": arr(obj({"channel_id": S("string"), "platform": NS(), "handle": NS(), "url": NS(format="uri"), "metrics": {"type": "object", "additionalProperties": S("number")}, "metrics_updated_at": NS(format="date-time")})),
        "totals": ref("Metrics"),
    }),
    "Webhook": obj({
        "id": S("string", format="uuid"), "url": S("string", format="uri"),
        "events": arr(S("string", enum=["post.published", "post.partial", "post.failed", "channel.needs_reconnect"])),
        "description": NS(), "secret_hint": S("string"), "created_at": S("string", format="date-time"),
        "last_delivery": {"type": ["object", "null"], "properties": {"status": S("string", enum=["pending", "delivered", "failed"]), "response_status": NS("integer"), "error": NS(), "created_at": S("string", format="date-time")}},
    }, ["id", "url", "events"]),
    "Delivery": obj({"id": S("string"), "event_id": S("string"), "event_type": S("string"), "status": S("string", enum=["pending", "delivered", "failed"]), "attempts": S("integer"), "response_status": NS("integer"), "error": NS(), "next_attempt_at": S("string", format="date-time"), "created_at": S("string", format="date-time"), "delivered_at": NS(format="date-time")}),
    "WebhookEvent": obj({
        "id": S("string", format="uuid", description="Unique per event: use it to ignore repeats"),
        "type": S("string"), "created_at": S("string", format="date-time"), "workspace_id": S("string", format="uuid"),
        "data": S("object"),
    }, ["id", "type", "created_at", "data"]),
}

paths = {
    "/me": {"get": {"summary": "Check a key", "description": "The workspace this key acts for.", "operationId": "getMe", "tags": ["Account"],
        "responses": {**ok("The workspace", obj({"workspace": obj({"id": S("string"), "name": NS()}), "channels": S("integer")})), **errs(401, 429)}}},
    "/channels": {"get": {"summary": "List channels", "operationId": "listChannels", "tags": ["Channels"],
        "responses": {**ok("Connected channels", obj({"channels": arr(ref("Channel"))})), **errs(401, 429)}}},
    "/posts": {
        "get": {"summary": "List posts", "operationId": "listPosts", "tags": ["Posts"],
            "parameters": [{"name": "status", "in": "query", "schema": S("string", enum=["draft", "scheduled", "publishing", "published", "failed"])}],
            "responses": {**ok("Up to 100 posts", obj({"posts": arr(ref("PostSummary"))})), **errs(401, 429)}},
        "post": {"summary": "Create a post", "description": "Save a draft, or schedule a post or thread. Send an Idempotency-Key so a retry can't post twice.", "operationId": "createPost", "tags": ["Posts"],
            "parameters": [{"name": "Idempotency-Key", "in": "header", "schema": S("string", maxLength=255), "description": "Repeat a request with the same key to get the first post back instead of a new one."}],
            "requestBody": body(obj({**post_fields, "idempotency_key": S("string", maxLength=255, description="Same as the Idempotency-Key header.")}),
                {"body": "Launching today 🚀", "channel_ids": ["<channel-id>"], "scheduled_at": "2026-10-01T09:00:00+01:00"}),
            "responses": {**ok("Created", obj({"post": ref("CreatedPost")}), "201"), **ok("A repeat of an earlier request (same idempotency key)", obj({"post": ref("CreatedPost")})), **errs(400, 401, 402, 429)}},
    },
    "/posts/{id}": {
        "get": {"summary": "Get a post", "description": "The post and each channel's status, live URL, error and latest metrics.", "operationId": "getPost", "tags": ["Posts"], "parameters": [pid],
            "responses": {**ok("The post", obj({"post": ref("Post")})), **errs(401, 404, 429)}},
        "patch": {"summary": "Edit a post", "description": "Edit or reschedule a draft or scheduled post. Only the fields you send change; scheduled_at null turns it into a draft.", "operationId": "updatePost", "tags": ["Posts"], "parameters": [pid],
            "requestBody": body(obj(post_fields), {"scheduled_at": "2026-10-02T09:00:00+01:00"}),
            "responses": {**ok("The edited post", obj({"post": ref("Post")})), **errs(400, 401, 402, 404, 409, 429)}},
    },
    "/posts/{id}/cancel": {"post": {"summary": "Cancel a post", "description": "Stop a scheduled post; it goes back to being a draft.", "operationId": "cancelPost", "tags": ["Posts"], "parameters": [pid],
        "responses": {**ok("Cancelled", obj({"ok": S("boolean"), "id": S("string"), "still_sending": S("integer", description="Channels already mid-send, which will finish")})), **errs(401, 404, 409, 429)}}},
    "/posts/{id}/retry": {"post": {"summary": "Retry a post", "description": "Send the post again to the channels where it failed. Channels that published are left alone.", "operationId": "retryPost", "tags": ["Posts"], "parameters": [pid],
        "responses": {**ok("Retrying", obj({"id": S("string"), "retrying": arr(S("string"), description="Channel ids being sent again")}), "202"), **errs(401, 402, 404, 409, 429)}}},
    "/media": {
        "get": {"summary": "List media", "operationId": "listMedia", "tags": ["Media"],
            "parameters": [{"name": "type", "in": "query", "schema": S("string", enum=["image", "video"])}, {"name": "search", "in": "query", "schema": S("string"), "description": "Part of a file name"}],
            "responses": {**ok("The newest 50 files", obj({"media": arr(ref("Media"))})), **errs(401, 429)}},
        "post": {"summary": "Add media from a URL", "description": "Download a file from a public https link into the media library.", "operationId": "addMedia", "tags": ["Media"],
            "requestBody": body(obj({"url": S("string", format="uri"), "name": S("string")}, ["url"]), {"url": "https://example.com/launch.png"}),
            "responses": {**ok("Added", obj({"media": ref("Media")}), "201"), **errs(400, 401, 429)}},
    },
    "/analytics": {"get": {"summary": "Get analytics", "description": "Published posts in a date range with each channel's latest metrics, plus totals for the whole range.", "operationId": "getAnalytics", "tags": ["Analytics"],
        "parameters": [
            {"name": "from", "in": "query", "schema": S("string", format="date"), "description": "First day (YYYY-MM-DD). Defaults to 29 days before to."},
            {"name": "to", "in": "query", "schema": S("string", format="date"), "description": "Last day (YYYY-MM-DD). Defaults to today (UTC). Up to 366 days."},
            {"name": "post_id", "in": "query", "schema": S("string", format="uuid"), "description": "Just this post (ignores the dates)."},
            {"name": "channel_id", "in": "query", "schema": S("string", format="uuid")},
            {"name": "platform", "in": "query", "schema": S("string")},
            {"name": "sort", "in": "query", "schema": S("string", enum=["date", "impressions", "likes", "comments", "shares", "saves", "engagement"], default="date")},
            {"name": "order", "in": "query", "schema": S("string", enum=["desc", "asc"], default="desc")},
            {"name": "limit", "in": "query", "schema": S("integer", minimum=1, maximum=100, default=50)},
            {"name": "offset", "in": "query", "schema": S("integer", minimum=0, default=0)},
        ],
        "responses": {**ok("Posts and totals", obj({"from": NS(format="date"), "to": NS(format="date"), "totals": {"allOf": [ref("Metrics"), obj({"posts": S("integer")})]}, "posts": arr(ref("AnalyticsPost")), "has_more": S("boolean")})), **errs(400, 401, 429)}}},
    "/webhooks": {
        "get": {"summary": "List webhooks", "operationId": "listWebhooks", "tags": ["Webhooks"],
            "responses": {**ok("Endpoints", obj({"webhooks": arr(ref("Webhook"))})), **errs(401, 429)}},
        "post": {"summary": "Add a webhook", "description": "Register an https endpoint. The signing secret is returned in this response only.", "operationId": "createWebhook", "tags": ["Webhooks"],
            "requestBody": body(obj({"url": S("string", format="uri"), "events": arr(S("string", enum=["post.published", "post.partial", "post.failed", "channel.needs_reconnect"])), "description": S("string")}, ["url", "events"]),
                {"url": "https://example.com/webhooks/postbase", "events": ["post.published", "post.partial", "post.failed"]}),
            "responses": {**ok("Added", obj({"webhook": {"allOf": [ref("Webhook"), obj({"secret": S("string", description="whsec_… Store it: it isn't shown again.")})]}}), "201"), **errs(400, 401, 429)}},
    },
    "/webhooks/{id}": {
        "get": {"summary": "List deliveries", "description": "An endpoint's recent deliveries, newest first.", "operationId": "listWebhookDeliveries", "tags": ["Webhooks"],
            "parameters": [pid, {"name": "limit", "in": "query", "schema": S("integer", minimum=1, maximum=100, default=20)}],
            "responses": {**ok("Deliveries", obj({"webhook": obj({"id": S("string"), "url": S("string"), "events": arr(S("string"))}), "deliveries": arr(ref("Delivery"))})), **errs(401, 404, 429)}},
        "delete": {"summary": "Delete a webhook", "operationId": "deleteWebhook", "tags": ["Webhooks"], "parameters": [pid],
            "responses": {**ok("Deleted", obj({"ok": S("boolean"), "id": S("string")})), **errs(401, 404, 429)}},
    },
    "/webhooks/{id}/test": {"post": {"summary": "Send a test event", "description": "Send a webhook.test event now and report the response. Not retried.", "operationId": "testWebhook", "tags": ["Webhooks"], "parameters": [pid],
        "responses": {**ok("The result", obj({"event_id": S("string"), "delivered": S("boolean"), "response_status": NS("integer"), "error": NS()})), **errs(401, 404, 429)}}},
}

sig_headers = [
    {"name": "Postbase-Event-Id", "in": "header", "schema": S("string")},
    {"name": "Postbase-Event-Type", "in": "header", "schema": S("string")},
    {"name": "Postbase-Timestamp", "in": "header", "schema": S("string"), "description": "Unix seconds"},
    {"name": "Postbase-Signature", "in": "header", "schema": S("string"), "description": "sha256=<hex HMAC-SHA256 of `${timestamp}.${raw body}` with the endpoint's secret>"},
]
def hook(summary, desc, data):
    return {"post": {"summary": summary, "description": desc, "parameters": sig_headers,
        "requestBody": body({"allOf": [ref("WebhookEvent"), obj({"data": data})]}),
        "responses": {"200": {"description": "Return any 2xx within 10 seconds. Anything else is retried with backoff (1 min, 5 min, 30 min, 2 h, 6 h)."}}}}

spec = {
    "openapi": "3.1.0",
    "info": {"title": "Postbase API", "version": "1.0.0",
        "description": "Schedule and manage social posts on X, LinkedIn, Bluesky, Mastodon and YouTube. Authenticate with an API key from Postbase → Developers, sent as `Authorization: Bearer pb_live_…`.",
        "contact": {"url": "https://www.postbase.so"}, "license": {"name": "AGPL-3.0", "identifier": "AGPL-3.0-only"}},
    "servers": [{"url": "https://www.postbase.so/api/v1"}],
    "security": [{"bearerAuth": []}],
    "tags": [{"name": n} for n in ["Posts", "Media", "Analytics", "Webhooks", "Channels", "Account"]],
    "paths": paths,
    "webhooks": {
        "post.published": hook("post.published", "The post went out on every channel.", obj({"post": ref("Post")})),
        "post.partial": hook("post.partial", "The post went out on some channels and failed on others (no more automatic retries).", obj({"post": ref("Post")})),
        "post.failed": hook("post.failed", "The post failed on every channel (no more automatic retries).", obj({"post": ref("Post")})),
        "channel.needs_reconnect": hook("channel.needs_reconnect", "A channel lost access (revoked or expired) and needs reconnecting in Postbase.",
            obj({"channel": obj({"id": S("string"), "platform": S("string"), "handle": NS(), "status": S("string"), "error": S("string")})})),
    },
    "components": {"securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer", "description": "A pb_live_ API key"}}, "schemas": schemas},
}

out = os.path.join(os.path.dirname(__file__), "..", "docs", "openapi.json")
with open(out, "w") as f:
    json.dump(spec, f, indent=2, ensure_ascii=False)
    f.write("\n")
print(f"wrote {os.path.normpath(out)}: {len(paths)} paths, {len(spec['webhooks'])} webhooks")
