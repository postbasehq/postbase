---
title: How to post to Bluesky with the API: app passwords, links, images and threads
seo_title: How to post to Bluesky with the API
description: Post to Bluesky through the AT Protocol: app passwords and OAuth, clickable links with facets, image uploads and threads, with working code.
date: 2026-09-24
category: Developers
related: /integrations/bluesky, /integrations/mastodon
---

Bluesky is the friendliest of the big networks to post to from code. There's no app review, no paid tier and no developer account. You can post from a script in about twenty lines.

It does have a few surprises, though. Links aren't clickable unless you make them so. Text positions are counted in bytes, not characters. And a thread reply has to point at two posts, not one. This guide covers all of it, based on what we built for Postbase.

Everything here was checked against the AT Protocol specs and lexicons on 26 September 2026.

## How posting works on Bluesky

Bluesky runs on the **AT Protocol**. Every account lives on a server called a PDS (for most people, `https://bsky.social`). A post is a **record** of type `app.bsky.feed.post` that you write into the user's repository with `com.atproto.repo.createRecord`. That's the whole model: no special "tweet" endpoint, just records.

## Step 1: sign in

There are two ways to authenticate:

- **OAuth** is the method the AT Protocol specs now describe as primary. It's the right choice for a public app where lots of people connect their accounts.
- **App passwords** still work and are much simpler. The user creates one in Bluesky under **Settings → Privacy and security → App passwords**, and you sign in with their handle and that password. App passwords can't change the account's email or password, and the user can revoke them any time.

For a script or an internal tool, app passwords are the quick path:

```ts
const PDS = "https://bsky.social";

async function xrpc(method: string, body: unknown, token?: string) {
  const res = await fetch(`${PDS}/xrpc/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method}: ${res.status} ${await res.text()}`);
  return res.json();
}

const session = await xrpc("com.atproto.server.createSession", {
  identifier: "yourname.bsky.social",
  password: process.env.BLUESKY_APP_PASSWORD,
});
// session.accessJwt, session.refreshJwt, session.did
```

The `accessJwt` only lasts a few minutes. For a long-running app, refresh it with `com.atproto.server.refreshSession`. For scheduled posting, we simply create a fresh session right before each post.

## Step 2: create a post

```ts
await xrpc(
  "com.atproto.repo.createRecord",
  {
    repo: session.did,
    collection: "app.bsky.feed.post",
    record: {
      $type: "app.bsky.feed.post",
      text: "Hello from the AT Protocol",
      createdAt: new Date().toISOString(),
    },
  },
  session.accessJwt,
);
```

The response has the new post's `uri` (an `at://` address) and `cid`. Keep both: you need them for replies. The web link is `https://bsky.app/profile/{handle}/post/{last part of the uri}`.

Posts are limited to **300 graphemes**, which is roughly what a person would count as characters (an emoji with a skin tone counts as one), and 3,000 bytes.

## Step 3: make links clickable with facets

This catches everyone. If you post `Read more at https://example.com`, the URL shows up as **plain text**. Bluesky doesn't detect links for you. You describe them with **facets**, which mark a range of the text as a link, and the ranges are **UTF-8 byte offsets**, not string indexes:

```ts
function linkFacets(text: string) {
  const enc = new TextEncoder();
  const facets = [];
  for (const m of text.matchAll(/https?:\/\/[^\s]+/g)) {
    const url = m[0].replace(/[.,)\]]+$/, ""); // drop trailing punctuation
    const byteStart = enc.encode(text.slice(0, m.index)).length;
    facets.push({
      index: { byteStart, byteEnd: byteStart + enc.encode(url).length },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: url }],
    });
  }
  return facets;
}

record.facets = linkFacets(record.text);
```

If you use JavaScript string indexes instead of bytes, links break as soon as the text before them contains an emoji or an accented letter. Mentions work the same way with the `#mention` feature, but you need to resolve the handle to a DID first.

## Step 4: attach images

Upload each image as a blob, then embed the blob references in the post. A post can have **up to 4 images**, and each can be up to **2,000,000 bytes**:

```ts
const blobRes = await fetch(`${PDS}/xrpc/com.atproto.repo.uploadBlob`, {
  method: "POST",
  headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "image/jpeg" },
  body: jpegBytes,
});
const { blob } = await blobRes.json();

record.embed = {
  $type: "app.bsky.embed.images",
  images: [{ alt: "A bag of coffee on a shelf", image: blob }],
};
```

Two tips:

- **Write real alt text.** Bluesky users notice, and it's what screen readers read.
- **Compress on the way in.** Phone photos are often well over 2 MB. We re-encode to JPEG and step the quality and width down until the image fits.

## Step 5: post a thread

A reply needs **two** references: `root` (the first post in the thread) and `parent` (the post directly above). Both are `{ uri, cid }` pairs:

```ts
async function postThread(texts: string[]) {
  let root, parent;
  for (const text of texts) {
    const record: Record<string, unknown> = {
      $type: "app.bsky.feed.post",
      text,
      createdAt: new Date().toISOString(),
      facets: linkFacets(text),
    };
    if (root && parent) record.reply = { root, parent };
    const created = await xrpc(
      "com.atproto.repo.createRecord",
      { repo: session.did, collection: "app.bsky.feed.post", record },
      session.accessJwt,
    );
    const ref = { uri: created.uri, cid: created.cid };
    root ??= ref;
    parent = ref;
  }
}
```

If you set only `parent`, or point `root` at the wrong post, the reply shows up disconnected from the thread in some clients.

## Errors you'll actually see

- **401 `AuthenticationRequired` on createSession.** Wrong handle or app password. Handles need the full domain, like `name.bsky.social`.
- **400 `ExpiredToken`.** The access token timed out. Refresh the session, or create a new one.
- **An error about the blob being too large.** An image is over the size limit. Compress it and try again.
- **Link not clickable, but no error.** Missing or wrong facets. Check you used byte offsets.

## Or skip the plumbing

If you post to Bluesky alongside other networks, connect it to Postbase once with an app password and post through our API. Links get facets automatically, and threads are chained for you:

```bash
curl https://www.postbase.so/api/v1/posts \
  -H "Authorization: Bearer $POSTBASE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "thread": ["We just shipped offline mode.", "Details and a demo: https://example.com/offline"],
    "channel_ids": ["<your Bluesky channel id>", "<your Mastodon channel id>"],
    "scheduled_at": "2026-10-01T09:00:00Z"
  }'
```

See [Bluesky scheduling in Postbase](/integrations/bluesky), or count your post against the 300 limit with our [character counter](/tools/character-counter).
