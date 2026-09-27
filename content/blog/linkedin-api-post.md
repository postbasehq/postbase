---
title: How to post to LinkedIn with the API: images, first comments and gotchas
seo_title: How to post to LinkedIn with the API
description: LinkedIn's Posts API in practice: versioned headers, images, first comments, token expiry and the escaping rule that breaks most first attempts.
date: 2026-09-25
category: Developers
related: /integrations/linkedin, /integrations/x
---

LinkedIn's API is well documented and still easy to get wrong. The endpoints have moved (`ugcPosts` is out, `/rest/posts` is in), every request needs a version header, and a single `#` in the post text can break the request. This is the guide we wish we'd had when we built LinkedIn publishing into Postbase.

Everything here was checked against LinkedIn's documentation on 26 September 2026.

## What you can post, and as whom

There are two very different levels of access:

| | Personal profile | Company page |
|---|---|---|
| Scope | `w_member_social` | `w_organization_social` |
| How you get it | Add the self-serve **Share on LinkedIn** product to your app | Apply for the **Community Management API** |
| Approval | Instant | Review. Only for registered organisations with a commercial use case, and it must be the only product on that app |

If you only need to post as yourself or your users, Share on LinkedIn is enough and you can start today. Company pages are a separate application, which is why many tools (Postbase included, for now) support personal profiles first.

## Step 1: set up the app

1. Create an app in the LinkedIn Developer Portal and link it to a company page (LinkedIn requires one, even for personal posting).
2. Under **Products**, add **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**.
3. Add your redirect URL under **Auth**.

Then send users to the authorization URL with the scopes `openid profile w_member_social`:

```ts
const params = new URLSearchParams({
  response_type: "code",
  client_id: process.env.LINKEDIN_CLIENT_ID!,
  redirect_uri: "https://yourapp.com/api/linkedin/callback",
  scope: "openid profile w_member_social",
  state,
});
redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
```

Exchange the code at `https://www.linkedin.com/oauth/v2/accessToken`, then call `GET https://api.linkedin.com/v2/userinfo`. The `sub` field is the member id. Your author URN is `urn:li:person:{sub}`.

## Step 2: know how long tokens last

LinkedIn access tokens last **60 days**. Programmatic refresh tokens are only available to a limited set of approved partners. For everyone else, when the token expires, the user signs in again. If they're still logged in to LinkedIn and the old token hasn't expired yet, the consent screen is skipped, so re-authorising before expiry is nearly invisible.

Plan for it: store the expiry date, and prompt users to reconnect a week or so before it runs out, rather than letting a scheduled post fail.

## Step 3: create a text post

Every call to the versioned API needs two headers: `LinkedIn-Version` (a `YYYYMM` month; `202609` at the time of writing) and `X-Restli-Protocol-Version: 2.0.0`. LinkedIn retires old versions on a schedule, so keep the version in config rather than hard-coding it.

```ts
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "LinkedIn-Version": process.env.LINKEDIN_API_VERSION ?? "202609",
  "X-Restli-Protocol-Version": "2.0.0",
};

const res = await fetch("https://api.linkedin.com/rest/posts", {
  method: "POST",
  headers,
  body: JSON.stringify({
    author: authorUrn,
    commentary: escapeCommentary(text),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  }),
});

// The new post's URN is in a header, not the body.
const postUrn = res.headers.get("x-restli-id");
```

That last line catches people out: a successful create returns **201 with an empty body**. The id is in the `x-restli-id` header.

## The escaping gotcha

The `commentary` field uses LinkedIn's "little text" format, where several characters are reserved for mentions and hashtags. Send user text as-is and a stray `(`, `#` or `@` either breaks the request or renders strangely. Escape the reserved characters with a backslash:

```ts
function escapeCommentary(text: string) {
  return text.replace(/[\\<>#~@|{}[\]()*_]/g, (c) => `\\${c}`);
}
```

The post then shows the text exactly as typed. The trade-off is that hashtags and mentions appear as plain text rather than links. To make real mentions, use the little text mention syntax with the person's URN instead of escaping.

## Step 4: attach images

Images are uploaded in two steps: ask LinkedIn for an upload URL, then `PUT` the bytes to it.

```ts
// 1. Initialize
const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
  method: "POST",
  headers,
  body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
});
const { value } = await init.json(); // { uploadUrl, image: "urn:li:image:..." }

// 2. Upload the bytes
await fetch(value.uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: bytes });
```

Then reference the image URN in the post:

```ts
// one image
content: { media: { id: imageUrn } }

// several images
content: { multiImage: { images: imageUrns.map((id) => ({ id })) } }
```

JPG, PNG and GIF all work without conversion.

## Step 5: add a first comment

Putting the link in the first comment rather than the post is a common LinkedIn habit. Once you have the post URN, comment on it:

```ts
await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
  body: JSON.stringify({ actor: authorUrn, message: { text: "Link: https://example.com" } }),
});
```

Treat the comment as best-effort. If the post went out and the comment failed, don't mark the whole thing as failed and retry, or you'll post twice. LinkedIn's newer Comments API docs list separate `_feed` scopes for commenting, so test with your own app's permissions before you rely on it.

## Limits worth knowing

- **Length:** LinkedIn's post box allows 3,000 characters. The Posts API returns `FIELD_LENGTH_TOO_LONG` if you go over.
- **Rate limits:** Share on LinkedIn lists 150 requests per member per day and 100,000 per app per day.
- **Video and documents** use separate upload APIs with their own multi-step flows.

## Errors you'll actually see

- **401 on any call.** The token has expired (the 60 days are up), so the user needs to reconnect.
- **403 on `/rest/posts`.** The token doesn't have `w_member_social`, or you're posting as an organisation without Community Management access.
- **An error saying the requested version isn't active.** Your `LinkedIn-Version` has been retired. Move to a newer month.
- **A 4xx error that points at `/commentary`.** Usually unescaped reserved characters in the post text.

## Or skip the plumbing

If you'd rather not manage versions, token expiry and escaping, connect LinkedIn to Postbase once and post through our API. A thread's second part becomes the first comment automatically:

```bash
curl https://www.postbase.so/api/v1/posts \
  -H "Authorization: Bearer $POSTBASE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "thread": ["Our new pricing page is live. Here is what changed and why.", "Read it here: https://example.com/pricing"],
    "channel_ids": ["<your LinkedIn channel id>"],
    "scheduled_at": "2026-10-01T08:00:00Z"
  }'
```

The API and [MCP server](/ai) post text today; attach images in the Postbase composer. See [LinkedIn scheduling in Postbase](/integrations/linkedin).
