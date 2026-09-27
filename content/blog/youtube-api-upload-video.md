---
title: How to upload videos to YouTube with the API (and why they come out private)
seo_title: Upload videos to YouTube with the API
description: Upload videos and Shorts with the YouTube Data API: OAuth scopes, resumable uploads, the new quota, and why unaudited apps' videos are private.
date: 2026-09-23
category: Developers
related: /integrations/youtube, /integrations/tiktok
---

Uploading a video to YouTube from code takes two HTTP requests. Getting that video to be **public** is another matter. This guide covers the upload itself, the quota (which changed recently), and the rule that makes every video private until Google has audited your app.

Everything here was checked against Google's YouTube Data API docs on 26 September 2026.

## The rule to know first: unaudited apps upload private videos

Videos uploaded through the API by a Google Cloud project created after **28 July 2020** are **restricted to private viewing** until the project passes a YouTube API compliance audit. It doesn't matter what `privacyStatus` you send.

So if you've just built an uploader and every video comes out private, your code is probably fine. You need to apply for the audit through the YouTube API Services form, and until you're approved, uploads stay private and the channel owner has to publish them by hand in YouTube Studio.

Plan for this early. The audit reviews your app, your privacy policy and how you use the data, and it takes time.

## Step 1: set up OAuth

In Google Cloud, enable the **YouTube Data API v3**, create an OAuth client (web application) and configure the consent screen. Uploading needs the scope:

```
https://www.googleapis.com/auth/youtube.upload
```

Add `youtube.readonly` if you also want to read the channel name or video stats. Request `access_type=offline` and `prompt=consent` to get a refresh token, because Google access tokens last about an hour.

```ts
const params = new URLSearchParams({
  client_id: process.env.YOUTUBE_CLIENT_ID!,
  redirect_uri: "https://yourapp.com/api/youtube/callback",
  response_type: "code",
  scope: [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
  ].join(" "),
  access_type: "offline",
  prompt: "consent",
  state,
});
redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
```

## Step 2: start a resumable upload

Resumable uploads have two steps. First, send the video's metadata and get back an upload URL:

```ts
const init = await fetch(
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(bytes.byteLength),
    },
    body: JSON.stringify({
      snippet: { title, description },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    }),
  },
);
const uploadUrl = init.headers.get("location");
```

The upload URL is in the `Location` header.

## Step 3: upload the bytes

```ts
const put = await fetch(uploadUrl!, {
  method: "PUT",
  headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.byteLength) },
  body: bytes,
});
const video = await put.json(); // video.id
```

For small files, one `PUT` is fine. For large ones, upload in chunks with `Content-Range` headers so a dropped connection doesn't mean starting over. You can ask the upload URL how much it has received and continue from there. The API accepts files up to 256 GB.

## Titles, descriptions and made-for-kids

- **Title:** up to 100 characters. Required.
- **Description:** up to 5,000 **bytes**, not characters. Emoji and non-Latin text use several bytes each, so a "4,000-character" description can be too long.
- Neither can contain `<` or `>`. Strip them, or the upload is rejected.
- **`selfDeclaredMadeForKids`:** set it explicitly. It's a legal declaration under children's privacy rules, so ask the user rather than guessing.

## How Shorts work

There's no "Short" flag in the API. YouTube treats a video as a Short if it has a **square or vertical aspect ratio** and is **up to three minutes long**. Upload it the normal way and YouTube classifies it. Adding `#Shorts` to the title or description is optional.

## Quota: much cheaper than it used to be

Uploads used to cost around 1,600 units each out of a default 10,000 a day, so a new project could manage about six uploads a day. That's changed:

- In December 2025, Google cut the cost of an upload to about 100 units.
- Since 1 June 2026, `videos.insert` has its own quota bucket. The default is now **100 uploads a day**, plus 100 `search.list` calls and 10,000 units a day for everything else.

If you need more, you can request a quota increase, which also goes through the compliance audit.

## Errors you'll actually see

- **403 `quotaExceeded`.** You've used today's allocation. The quota resets at midnight Pacific time.
- **`invalid_grant` when refreshing.** The user revoked access, or the refresh token expired. While your OAuth consent screen is in testing mode, refresh tokens expire after 7 days.
- **400 `invalidTitle` or `invalidDescription`.** Too long, empty, or containing `<` or `>`.
- **The video uploads but stays private.** See the audit rule at the top.

## Or skip the plumbing

Postbase uploads to YouTube for you: connect a channel once, add the video in the composer, and the start of your post becomes the title and the full text the description. You can post the same video to [TikTok](/integrations/tiktok) at the same time. See [YouTube scheduling in Postbase](/integrations/youtube).
