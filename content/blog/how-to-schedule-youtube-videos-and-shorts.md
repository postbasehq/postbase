---
title: How to schedule YouTube videos and Shorts
description: How to schedule YouTube videos and Shorts in YouTube Studio, how time zones and rescheduling work, and how to post to YouTube and TikTok at once.
date: 2026-09-27
category: Guides
related: /integrations/youtube, /integrations/tiktok, /blog/youtube-api-upload-video
---

YouTube has solid scheduling built in, so for a single video you may not need anything else. This guide covers how to use it, a few details that catch people out, and when a scheduling tool helps, usually when the same video is also going to TikTok.

Details were checked against YouTube's help centre on 27 September 2026.

## Schedule a video in YouTube Studio

1. Open **YouTube Studio** and click **Create → Upload videos**.
2. Choose your video and fill in the title, description, thumbnail and audience ("made for kids" or not).
3. On the **Visibility** step, choose **Schedule**.
4. Set the **date, time and time zone**, then click **Schedule**.

The video stays private until that moment, then goes public on its own. You can do the same from the YouTube app on your phone.

## Scheduling Shorts

YouTube treats a video as a Short if it's **square or vertical and up to three minutes long**. There's no separate "Short" setting: upload it like any other video and YouTube classifies it. That also means you schedule a Short the same way, through the visibility step.

## Details that catch people out

- **Time zones.** You pick the time zone when you schedule, but the date shown on the watch page is based on Pacific Time. A video scheduled for early morning in Europe can show the previous day's date.
- **Rescheduling.** Go to **Content**, open the video's **Visibility** and pick a new time. The video has to still be private (not yet published) to change it.
- **Strikes.** If your channel has a Community Guidelines strike, scheduled videos won't publish during the penalty period.
- **Processing.** Upload well before the scheduled time, especially for long or 4K videos, so processing and checks finish first.

## Premieres: when to use one

A Premiere is a scheduled video with a public watch page before it starts, where viewers can set a reminder and chat while it plays for the first time. Tick **Set as Premiere** when scheduling.

Use one for a launch or a big video where a live audience matters. Skip it for routine uploads. Shorts, videos above 1080p and 360° videos can't be Premieres.

## When a scheduling tool helps

YouTube Studio is all you need if YouTube is your only channel. A tool starts to pay off when:

- **The same video goes to TikTok** (and often a clip to X or LinkedIn). Uploading and captioning it twice gets old fast.
- **You plan in batches** and want to see the whole week, across networks, on one calendar.
- **You want AI help** with titles and descriptions.

## Schedule YouTube and TikTok together with Postbase

1. **Connect YouTube** on the Channels page. You sign in on Google's own screen.
2. **Add the video once** in the composer and pick YouTube, and TikTok too if you like.
3. **Write the post.** The start of it becomes the YouTube title (up to 100 characters) and the full text becomes the description. Open the TikTok tab to write a different caption there.
4. **Choose the visibility** in the YouTube settings: Public, Unlisted or Private.
5. **Pick a time** and schedule it.

::demo composer network=youtube caption="One video, a caption for each network. The YouTube settings in the composer set the video's visibility."

One difference from YouTube Studio: Postbase uploads the video at the time you choose, instead of uploading now and releasing it later. For a long video, schedule it a few minutes before you want it live, so YouTube has time to process it.

## Tips for scheduled YouTube uploads

- **Keep the title short and clear.** Titles can be up to 100 characters, but the start is what people see.
- **Descriptions are measured in bytes.** The limit is 5,000 bytes, and emoji and non-Latin characters take several each.
- **Set "made for kids" honestly.** It's a legal declaration, not a preference.
- **Use Unlisted for previews.** Share the link with a client or teammate before a video goes public.

Building your own uploader instead? Read [how to upload videos with the YouTube API](/blog/youtube-api-upload-video), including the rule that makes videos from unaudited apps private.
