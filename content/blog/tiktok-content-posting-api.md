---
title: "TikTok Content Posting API: how to post videos and pass the audit"
seo_title: TikTok Content Posting API: post and pass the audit
description: How to post to TikTok from your own app: Direct Post vs Upload, creator_info, video and photo uploads, and the UX rules TikTok's audit checks.
date: 2026-09-26
category: Developers
related: /integrations/tiktok, /integrations/youtube
---

TikTok's Content Posting API is the only official way to publish to TikTok from your own software. The API itself is manageable. The hard part is the **audit**: until TikTok approves your app, everything you post is private, and approval depends as much on your UI as on your code.

We went through the audit for Postbase and passed in September 2026. This guide covers the API and the things the reviewers actually look at.

Everything here was checked against TikTok's developer docs on 26 September 2026.

## Two ways to post

| | Direct Post | Upload (to inbox) |
|---|---|---|
| Scope | `video.publish` | `video.upload` |
| What happens | The video is published to the profile | The creator gets a notification and finishes posting in the TikTok app |
| Audit needed for public posts | Yes | No, the creator publishes it themselves |
| Limits | 6 requests per minute per user token | At most 5 pending shares per 24 hours |

If you want scheduled posts that go out on their own, you need **Direct Post**, and so you need the audit. Upload mode is a good stopgap: it works immediately, but someone has to open TikTok to finish each post.

## What unaudited apps can do

Before approval, a Direct Post app is heavily restricted:

- Every post is **private** (`SELF_ONLY`).
- The posting accounts themselves must be **private accounts**. Otherwise you get `unaudited_client_can_only_post_to_private_accounts`.
- At most **5 users** can post through your app in a 24-hour window.

That's enough to build and record a demo for the audit, but not enough to launch.

## Step 1: always call creator_info first

Before every post, fetch the creator's current settings:

```ts
const info = await tiktok("/v2/post/publish/creator_info/query/", {});
// info.data: creator_nickname, creator_avatar_url, privacy_level_options,
// comment_disabled, duet_disabled, stitch_disabled, max_video_post_duration_sec
```

This isn't optional. The response drives what your UI must show (see the audit section below), which privacy levels are allowed for this creator, and the longest video they can post. Some creators are limited to 3, 5 or 10 minutes, so check the video's length against `max_video_post_duration_sec` before you upload.

## Step 2: post a video

Direct Post is initialize, upload, then poll for the result.

```ts
const init = await tiktok("/v2/post/publish/video/init/", {
  post_info: {
    title: caption,
    privacy_level: chosenPrivacy, // must be one of privacy_level_options
    disable_comment: !allowComments,
    disable_duet: !allowDuet,
    disable_stitch: !allowStitch,
    brand_content_toggle: brandedContent,
    brand_organic_toggle: yourBrand,
  },
  source_info: {
    source: "FILE_UPLOAD",
    video_size: bytes.byteLength,
    chunk_size: bytes.byteLength,
    total_chunk_count: 1,
  },
});
const { publish_id, upload_url } = init.data;

await fetch(upload_url, {
  method: "PUT",
  headers: {
    "Content-Type": "video/mp4",
    "Content-Range": `bytes 0-${bytes.byteLength - 1}/${bytes.byteLength}`,
  },
  body: bytes,
});
```

Videos can be up to 4 GB and up to 10 minutes long, as MP4 (recommended), WebM or MOV. Chunks must be between 5 and 64 MB, except the last, which can be up to 128 MB, and they're uploaded in order. A video under 64 MB can go up in a single chunk, as above.

Then poll `/v2/post/publish/status/fetch/` with the `publish_id` until the status is `PUBLISH_COMPLETE`, or a failure you can show the user. Processing takes anything from a few seconds to a few minutes.

**FILE_UPLOAD or PULL_FROM_URL?** With `PULL_FROM_URL`, TikTok downloads the video from a URL you give it, but that URL's domain has to be verified in your TikTok developer app. `FILE_UPLOAD` needs no verification, so it's the easier start for video.

## Step 3: post photos

Photo posts use a different endpoint, `/v2/post/publish/content/init/`, with `media_type: "PHOTO"` and **up to 35 images**. Photos only support `PULL_FROM_URL`, so you have to serve them from a domain you've verified with TikTok.

That caught us out. Our images lived in cloud storage on a domain we couldn't verify, so we serve TikTok photos through a small proxy on our own domain instead. Images must be WebP or JPEG, up to 1080p and 20 MB each. Photo titles can be up to 90 characters and descriptions up to 4,000. A title over 90 fails the whole post, so we put the caption in `description` and leave the title out.

## What the audit actually checks

TikTok's [content sharing guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) are specific, and reviewers check your posting screen against them in a screen recording. These were the ones that mattered:

1. **Show who's posting.** Display the creator's nickname (and ideally avatar) from `creator_info`, so it's obvious which account the post will go to.
2. **Privacy has no default.** Offer the options from `privacy_level_options` in a dropdown, and make the creator pick one. The guidelines say there should be no default value, so don't pre-select "Public".
3. **Interaction settings.** Comment, Duet and Stitch toggles, all **off by default**, and greyed out if the creator has turned them off in TikTok.
4. **Commercial content disclosure.** A switch, off by default. When it's on, the creator must tick at least one of "Your brand" (shown as *Promotional content*) or "Branded content" (shown as *Paid partnership*). Branded content can't be set to private.
5. **The consent line.** Near the post button: "By posting, you agree to TikTok's Music Usage Confirmation", plus the Branded Content Policy when branded content is selected.
6. **A preview** of the video or photos, and a title the creator can edit.
7. **Nothing goes out without an explicit action.** The creator must press post, or schedule, after seeing all of the above.
8. **Respect the length limit** from `creator_info` before uploading.

::demo composer network=tiktok caption="Postbase's composer with a TikTok video attached. In the app, a TikTok settings panel holds the privacy, interaction and disclosure settings."

## Tips for the audit submission

- **Record the whole flow**: connecting an account, the posting screen with every setting visible, and the finished post on TikTok.
- **Use a clean test account** set to private, since unaudited apps can only post to private accounts anyway.
- **Explain scheduling.** If posts go out later, say so and show where the creator reviews them before they publish.
- **Match your privacy policy and terms** to what the app does with TikTok data.

## Or skip the audit

If you want to schedule TikToks without building and auditing your own integration, Postbase has passed the audit. Connect your TikTok account, upload the video in the composer, choose your settings and schedule it alongside [YouTube](/integrations/youtube) and everything else. See [TikTok scheduling in Postbase](/integrations/tiktok).
