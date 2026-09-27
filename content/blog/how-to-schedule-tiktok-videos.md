---
title: How to schedule TikTok videos (desktop, and from a tool)
description: TikTok lets you schedule videos 15 minutes to 10 days ahead from a desktop browser. Here's how, the limits to know about, and how to schedule further ahead or alongside YouTube.
date: 2026-09-27
category: Guides
related: /integrations/tiktok, /integrations/youtube, /blog/tiktok-content-posting-api
---

TikTok has a built-in scheduler, but it's easy to miss because it isn't in the mobile app. This guide covers how to use it, its limits, and when a scheduling tool makes more sense.

Details were checked against TikTok's own announcement of its video scheduler on 27 September 2026.

## Schedule a TikTok from your computer

1. Go to **tiktok.com** in a desktop browser and sign in.
2. Click **Upload** and choose your video.
3. Write the caption, pick a cover and choose who can watch.
4. Switch on **Schedule** and pick a date and time.
5. Click **Schedule**.

TikTok lets you schedule **anywhere from 15 minutes to 10 days** ahead.

## The limits of TikTok's scheduler

- **Desktop only.** The official scheduler is on the web upload page, not in the phone app.
- **Account type.** TikTok's announcement says a Business Account is required. Check your account settings if you don't see the option.
- **10 days maximum.** Planning a month of content means coming back every week or so.
- **No editing.** You can't edit a scheduled video. To change the caption or time, delete it and upload it again.
- **TikTok only.** If the same video is going to YouTube Shorts, that's a separate upload in YouTube Studio.

## When a scheduling tool makes sense

A tool is worth it if you post the same video to TikTok and YouTube, want to plan more than 10 days ahead, or want everything on one calendar. With Postbase:

1. **Connect TikTok** on the Channels page. You sign in on TikTok's own screen.
2. **Upload the video** once in the composer, and pick YouTube too if you like.
3. **Set the TikTok options**: who can view it, whether people can comment, duet or stitch, and whether it's promotional or a paid partnership.
4. **Pick a time** and schedule it.

::demo composer network=tiktok caption="Scheduling a TikTok in Postbase: add the video once, write the caption, and pick a time."

Postbase posts through TikTok's official Content Posting API and has passed TikTok's audit, so posts go out with the visibility you choose.

## Photo posts

TikTok also supports photo posts, a swipeable carousel of images. Postbase can schedule those too: add up to 35 images instead of a video.

## Tips for scheduled TikToks

- **Keep the first second strong.** Scheduling doesn't change the algorithm, but posting consistently does help.
- **Check your video length.** Some accounts are limited to 3, 5 or 10 minutes.
- **Write the caption for search.** TikTok captions can be up to 2,200 characters, and people search TikTok like a search engine.
- **Label paid partnerships.** TikTok requires it, and a scheduler should make it easy.

Building your own TikTok integration instead? Read [how to use the Content Posting API and pass the audit](/blog/tiktok-content-posting-api).
