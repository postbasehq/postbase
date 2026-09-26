---
title: How to post to X with the API in 2026: threads, media and pricing
description: A working guide to posting on X with API v2, covering pay-per-use pricing, OAuth 2.0 scopes, creating posts and threads, uploading images and video, and counting characters the way X does.
date: 2026-09-26
category: Developers
related: /integrations/x, /ai/claude-code
---

Posting to X from code is simple once you're set up, and fiddly getting there. This guide covers what we learned building X publishing into Postbase: what it costs now, which scopes you need, and how threads, images and video actually work.

Everything here was checked against X's developer docs on 26 September 2026.

## What it costs now

X no longer has Free, Basic and Pro API tiers. In 2026 it moved to a single **pay-per-use** plan: you buy credits in the Developer Console and each request draws them down. There's no subscription or minimum. At the time of writing, [X's pricing page](https://docs.x.com/x-api/getting-started/pricing) lists:

| Action | Price per request |
|---|---|
| Create a post | $0.015 |
| Read a post | $0.005 per resource |

Posts that contain a URL are priced separately and much higher on the same page, so check the Developer Console before you build anything that posts lots of links. Legacy Basic and Pro subscribers are being moved to pay-per-use.

Rate limits are no longer tied to a tier. `POST /2/tweets` allows **100 requests per 15 minutes per user** and **10,000 per 24 hours per app**.

## Step 1: create an app and get a user token

In the X Developer Console, create a project and app, turn on **OAuth 2.0** with the "Web App" type, and add your callback URL. Posting on behalf of a user needs the **authorization code flow with PKCE** and these scopes:

| Scope | Why |
|---|---|
| `tweet.read` | Needed alongside write |
| `tweet.write` | Create posts |
| `users.read` | Look up who connected |
| `media.write` | Upload images and video |
| `offline.access` | Get a refresh token |

Access tokens last **2 hours**. Without `offline.access` you don't get a refresh token, and the user has to sign in again every time, so always ask for it.

```ts
const params = new URLSearchParams({
  response_type: "code",
  client_id: process.env.X_CLIENT_ID!,
  redirect_uri: "https://yourapp.com/api/x/callback",
  scope: "tweet.read tweet.write users.read media.write offline.access",
  state,
  code_challenge: challenge, // S256 hash of your PKCE verifier
  code_challenge_method: "S256",
});
redirect(`https://x.com/i/oauth2/authorize?${params}`);
```

Exchange the code at `POST https://api.x.com/2/oauth2/token` with the verifier, and store both tokens. Refresh the access token with `grant_type=refresh_token` before it expires. The refresh response can include a new refresh token, so save whatever comes back every time.

## Step 2: create a post

```ts
const res = await fetch("https://api.x.com/2/tweets", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Hello from the API" }),
});
const { data } = await res.json(); // { id, text }
```

## Step 3: post a thread

A thread is a chain of replies to your own posts. Post the first one, then reply to each new post with `reply.in_reply_to_tweet_id`:

```ts
async function postThread(token: string, texts: string[]) {
  let previous: string | undefined;
  const ids: string[] = [];
  for (const text of texts) {
    const body = previous ? { text, reply: { in_reply_to_tweet_id: previous } } : { text };
    const res = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Post ${ids.length + 1} failed: ${res.status}`);
    previous = (await res.json()).data.id;
    ids.push(previous!);
  }
  return ids;
}
```

Two things we learned the hard way:

- **Post in order, one at a time.** Firing them in parallel gives you replies to posts that don't exist yet.
- **Decide what a half-posted thread means.** If post 3 of 5 fails, posts 1 and 2 are already live, and a naive retry posts them again. Save each id as it goes out, so a retry can carry on from the failed post.

## Step 4: attach images

Upload each image first, then pass the media ids when you create the post. Images go through the one-request endpoint:

```ts
const form = new FormData();
form.append("media", new Blob([bytes], { type: "image/jpeg" }));
form.append("media_category", "tweet_image");

const res = await fetch("https://api.x.com/2/media/upload", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const mediaId = (await res.json()).data.id;
```

Then:

```ts
body: JSON.stringify({ text: "With a picture", media: { media_ids: [mediaId] } })
```

A post can have **up to 4 images, or 1 GIF, or 1 video**. Images can be up to 5 MB and GIFs up to 15 MB.

## Step 5: attach a video

Video uses the chunked upload: initialize, append the bytes in pieces, finalize, then wait for X to process it.

```ts
const base = "https://api.x.com/2/media/upload";

// 1. Initialize
const init = await xPost(`${base}/initialize`, {
  media_type: "video/mp4",
  total_bytes: bytes.byteLength,
  media_category: "tweet_video",
});
const id = init.data.id;

// 2. Append, in order, chunks of 5 MB or less
const CHUNK = 1024 * 1024;
for (let i = 0; i * CHUNK < bytes.byteLength; i++) {
  const form = new FormData();
  form.append("media", new Blob([bytes.slice(i * CHUNK, (i + 1) * CHUNK)]));
  form.append("segment_index", String(i));
  await xPostForm(`${base}/${id}/append`, form);
}

// 3. Finalize
let info = (await xPost(`${base}/${id}/finalize`, {})).data.processing_info;

// 4. Wait for processing before you attach it
while (info && (info.state === "pending" || info.state === "in_progress")) {
  await sleep((info.check_after_secs ?? 2) * 1000);
  info = (await xGet(`${base}?command=STATUS&media_id=${id}`)).data.processing_info;
}
if (info?.state === "failed") throw new Error(info.error?.message ?? "X couldn't process the video");
```

X's docs allow videos of up to 20 minutes and 8 GB for regular accounts. In practice we cap uploads well below that and give processing a time limit, because a post can't go out until X says the video is ready.

## Counting characters the way X does

X's 280 limit is **weighted**, so `text.length` is wrong:

- Any URL counts as **23** characters, however long it is.
- Emoji and CJK characters count as **2**.
- Attached media counts as 0.
- Text is normalised (NFC) before counting.

Use the open-source `twitter-text` library, or try our [free character counter](/tools/character-counter), which uses the same rules.

## Errors you'll actually see

- **401 after a couple of hours.** The access token expired. Refresh it and retry once.
- **403 on `/2/tweets`.** Usually a missing scope. Check the token was issued with `tweet.write`, and `media.write` if you upload.
- **403 "duplicate content".** X rejects a post identical to one you posted recently. Change the text.
- **429.** You hit the rate limit. Read the `x-rate-limit-reset` header and wait until then.

## Or skip the plumbing

If you'd rather not maintain OAuth, token refresh, uploads and retries yourself, Postbase does it for you: connect an X account once and post with one request to our API:

```bash
curl https://www.postbase.so/api/v1/posts \
  -H "Authorization: Bearer $POSTBASE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "thread": ["First post", "Second post", "Third post"],
    "channel_ids": ["<your X channel id>"],
    "scheduled_at": "2026-10-01T09:00:00Z"
  }'
```

The same call can post to LinkedIn, Bluesky and Mastodon at once. The API and the [MCP server](/ai) handle text posts and threads today; to add images or video, attach them in the Postbase composer.
