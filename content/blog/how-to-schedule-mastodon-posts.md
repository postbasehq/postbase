---
title: How to schedule Mastodon posts (on any instance)
seo_title: How to schedule Mastodon posts and threads
description: Mastodon's official apps can't schedule posts, but its API can. Three ways to schedule Mastodon posts and threads, plus the limits and fixes.
date: 2026-10-25
category: Guides
related: /integrations/mastodon, /blog/cross-post-x-bluesky-mastodon-linkedin, /blog/bluesky-vs-mastodon-vs-threads, /tools/character-counter, /tools/best-time-to-post
---

Short answer: you can't schedule a post from Mastodon's own web app or its official iPhone and Android apps. There's no clock icon in the composer. But Mastodon itself supports scheduled posts under the hood, so any tool that uses its API can schedule for you, on any server.

This guide covers the three ways to do it, the limits that catch people out, and the habits that make scheduled posts fit in on the fediverse. It was checked against Mastodon's documentation on 25 October 2026.

## Why there's no schedule button

Mastodon's API has had a `scheduled_at` option since version 2.7, back in 2019. A post sent with it waits on your server until the time you picked, then goes out like any other. The official apps simply never added a button for it.

That matters for two reasons:

- **Scheduled posts are normal posts.** Your server publishes them itself. Nobody can tell a scheduled post from one you typed live, and there's no algorithm to treat them differently anyway.
- **Your server has to allow it.** Almost every server runs a modern Mastodon version, so this is rarely a problem, but forks and very old servers can differ.

## The three ways to schedule Mastodon posts

| Option | Best for | Threads | Other networks |
| --- | --- | --- | --- |
| A scheduling tool | Regular posting, several networks | Yes, in most tools | Yes |
| A third-party Mastodon app | Mastodon-only, occasional posts | Depends on the app | No |
| Your own script | Developers, automated posts | You build it | You build it |

## Option 1: a scheduling tool

A scheduling tool holds the post and sends it at the right time. The good ones sign in through your server's own login page, so they never see your password, and they handle threads by posting each part as a reply to the one before.

Here's how it works in Postbase:

1. **Connect Mastodon.** On the Channels page, choose Mastodon and type your server's address (mastodon.social, fosstodon.org, hachyderm.io or your own). You're sent to your server to sign in and approve access. There's no token to copy.
2. **Write the post.** The composer counts characters the way Mastodon does, so a long link only costs 23 characters.
3. **Add more posts for a thread.** Click **Add comment / post** for each part. Each one is checked against the 500-character limit separately.
4. **Pick other networks too**, if you want. Write once, then open the Mastodon tab to change the wording just for Mastodon.
5. **Pick a time**, or click an open slot on the calendar, and schedule it.

::demo composer network=mastodon caption="The Postbase composer with a Mastodon version of the post. The count follows Mastodon's rules, so links count as 23 characters."

Postbase works with any Mastodon server, including self-hosted ones. It publishes posts as public, and it retries if your server is briefly down when the post is due.

## Option 2: a third-party Mastodon app

Several Mastodon apps for the web, iPhone and Android add a schedule option to their composer, using the same `scheduled_at` feature. If Mastodon is the only place you post and you only schedule now and then, that's a fine route. Check the app's settings for "scheduled posts", since the feature is often hidden behind a long-press on the Post button.

The catch is that they only post to Mastodon, scheduled posts often can't be edited once queued, and most don't handle threads.

## Option 3: write a script

If you're a developer, scheduling is one request. Send `POST /api/v1/statuses` to your server with your post text and a `scheduled_at` date in ISO 8601 format. Mastodon requires the time to be **at least five minutes in the future**, allows up to 25 waiting posts per day and 300 in total, and returns a "scheduled status" you can later list, change or cancel through `/api/v1/scheduled_statuses`.

You'll need an access token with write access, which you can create on your server under **Preferences, then Development**. For threads, you'll have to wait for each post to publish before you can reply to it, which is where a tool or our [REST API](/developers) saves time.

## Mastodon limits to plan around

| What | Limit |
| --- | --- |
| Characters per post | 500 on most servers (some allow more) |
| How links count | Always 23 characters, however long the URL |
| How mentions count | Only the username, not the @server part |
| Media | Up to 4 images, or 1 video |
| Mastodon's own scheduling | At least 5 minutes ahead; 25 waiting posts a day, 300 in total |
| Algorithm | None: home timelines are chronological |

Check a draft the way Mastodon counts it with our [character counter](/tools/character-counter). It also splits long text into a thread.

## How scheduling fits Mastodon's culture

Mastodon users are friendly towards scheduled posts as long as there's a person behind them. A few habits help:

- **Show up for the replies.** Scheduling is for the post, not the conversation. Check back an hour or two after a post goes out.
- **Use hashtags.** With no algorithm, hashtags are how people find posts. Use one to three relevant tags in CamelCase (#OpenSource, not #opensource), which also helps screen readers.
- **Write alt text for every image.** It's expected on Mastodon, and posts without it get fewer boosts.
- **Don't flood timelines.** Timelines are chronological, so ten posts in a minute fill your followers' feeds. Spread them out.
- **Make it native.** A post that ends in "(1/n)" or has an X handle in it reads as copied from X. If you post to several networks, adjust the Mastodon version. Our guide to [cross-posting without it looking copy-pasted](/blog/cross-post-x-bluesky-mastodon-linkedin) has more.
- **Mark bots as bots.** If an account is fully automated, tick "This is an automated account" in your profile settings. Many servers require it.

## When to post on Mastodon

Because timelines are chronological, timing matters more on Mastodon than on networks with an algorithm. A post that goes out while your followers are asleep is mostly gone by the morning. Our [best time to post tool](/tools/best-time-to-post) suggests windows in your own time zone. As a rule of thumb, aim for the mornings and early evenings of wherever most of your followers live, and test from there.

## Common problems and fixes

**"Scheduled time must be at least 5 minutes in the future."** Mastodon refuses times closer than five minutes. Pick a later time or post it now.

**The post went out with the text cut short.** It didn't: Mastodon rejects posts over the limit instead of trimming them. If your server allows more than 500 characters, a tool that checks against 500 will ask you to split it. Use a thread instead.

**A thread arrived out of order.** Each part has to be a reply to the one before, so a tool must wait for each post before sending the next. Postbase does this for you; if you script it yourself, wait for each response.

**Your connection stopped working.** Servers sometimes reset app tokens after upgrades or moderation changes. Reconnect from the Channels page. Postbase emails you when a channel needs reconnecting, so a scheduled post doesn't fail silently.

**Your server is down at post time.** Self-hosted and small servers have the odd outage. Postbase retries failed posts automatically, and shows anything that still fails in the queue with a **Retry** button.

## Frequently asked questions

### Can you schedule posts on Mastodon?

Not from Mastodon's own web app or official mobile apps. But Mastodon's API supports scheduled posts, so a scheduling tool such as Postbase, or a third-party Mastodon app with a schedule option, can schedule them for you.

### Does scheduling work on every Mastodon server?

On nearly all of them. Scheduling has been part of Mastodon since version 2.7. Postbase signs in through your server's own login page, so it works with mastodon.social, smaller community servers and self-hosted ones alike.

### Can I schedule a Mastodon thread?

Yes. In Postbase, add each part with **Add comment / post**. At the scheduled time, Postbase publishes the first post, then each following one as a reply to the one before.

### How far ahead can I schedule a Mastodon post?

Mastodon's own scheduling needs a time at least five minutes ahead, and caps you at 25 waiting posts per day and 300 in total. Postbase holds scheduled posts itself and sends them at the time you pick, so those caps don't apply, and you can schedule as far ahead as you like.

### Do scheduled posts get less reach on Mastodon?

No. Mastodon has no ranking algorithm: posts appear in followers' timelines in the order they were published. Scheduled posts are published by your own server and look exactly like posts typed live.

### Can I cross-post from X or Bluesky to Mastodon?

Yes. Pick Mastodon along with X, Bluesky or LinkedIn in the Postbase composer, write once, and change the wording for Mastodon where it matters. Each network's limit is checked as you type.
