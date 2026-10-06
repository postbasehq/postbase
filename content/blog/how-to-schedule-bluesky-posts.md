---
title: Can you schedule posts on Bluesky? Here's how
seo_title: How to schedule Bluesky posts (and threads)
description: Bluesky's app has no built-in scheduling. Three ways to schedule Bluesky posts and threads anyway, the limits to plan around, and fixes for common problems.
date: 2026-09-27
updated: 2026-10-06
category: Guides
related: /integrations/bluesky, /mcp/bluesky, /ai/claude/bluesky, /blog/bluesky-api-post, /tools/character-counter
---

**Short answer: not in the Bluesky app itself.** As of October 2026, the official Bluesky app publishes a post the moment you tap Post. There's no scheduling option in its settings, and native scheduling is still an open feature request with no announced date. You can still schedule Bluesky posts, though. You need something that posts for you at the right time.

This guide covers the three ways to do that, the limits that catch people out, and what to do when a scheduled post doesn't come out the way you expected.

Everything here was checked on 6 October 2026.

## The three ways to schedule Bluesky posts

| | Scheduling tool | AI assistant | Your own script |
| --- | --- | --- | --- |
| **Setup** | A few minutes | A few minutes | An hour or more |
| **Threads** | Yes | Yes | You build the reply chain |
| **Images** | Yes | Through the tool | You upload them |
| **Clickable links** | Handled for you | Handled for you | You add facets |
| **Other networks** | Same draft | Same chat | Separate scripts |
| **Runs when your laptop is off** | Yes | Yes | Only on a server |

If you just want posts to go out on time, use a tool. If you write with Claude or Cursor already, the AI route saves a step. A script is for people who enjoy running it.

## Option 1: a scheduling tool

A scheduler connects to your Bluesky account and posts through Bluesky's official API at the time you choose. It's the easiest route, and the only one that handles threads, images and cross-posting without any work on your side. Bluesky is fine with this: it partnered with Buffer on scheduling in 2024, and many tools support it.

With Postbase:

1. **Create an app password** in Bluesky: Settings → Privacy and security → App passwords. An app password lets a tool post for you without your main password, and you can revoke it any time without changing anything else.
2. **Connect Bluesky** on the Postbase Channels page with your handle and the app password.
3. **Write your post** in the composer. Click **Add comment / post** to add the next post in a thread; each part gets its own 300-character counter.
4. **Pick a time**, or click an open slot on the calendar, and schedule it.

::demo composer network=bluesky caption="Writing a Bluesky version of a post in Postbase. The 300-character limit is checked as you type."

Links are made clickable automatically when the post goes out. That matters on Bluesky, which doesn't turn URLs into links by itself.

### What to look for in a Bluesky scheduler

- **Threads published as threads.** Each post should be a reply to the one before, not separate posts at the same time.
- **Link handling.** Bluesky needs extra data (facets) to make a link clickable. A good tool adds it; a lazy one leaves a plain-text URL.
- **App password, not your main password.** Never give a tool your Bluesky account password.
- **One draft, several networks.** Bluesky's 300 characters, X's 280 and Mastodon's 500 rarely fit one text. A tool should let you adjust each version side by side.

## Option 2: post from Claude or another AI tool

If you already write with Claude, ChatGPT, Cursor or Claude Code, you can let it schedule Bluesky posts for you. Add the [Postbase MCP server](/mcp/bluesky), sign in, and ask:

> Write a 3-post Bluesky thread about our launch and schedule it for Wednesday at 6pm.

The assistant checks your connected channels, writes the thread within the limit and schedules it. Everything it creates lands on your Postbase calendar first, so you can read it before it goes out. Here's [the Claude and Bluesky setup](/ai/claude/bluesky).

## Option 3: write a script

Bluesky is the easiest network to post to from code: no developer account, no app review and no fees. A small script run by cron or a scheduled GitHub Action can post at a set time. You'll need to:

- sign in with `com.atproto.server.createSession` and an app password
- create the post with `com.atproto.repo.createRecord`
- add **facets** yourself if you want links and mentions to be clickable
- chain `reply` references (the thread's root and the post before) for a thread

We walk through all of it, with code, in [How to post to Bluesky with the API](/blog/bluesky-api-post). The catch is that you're now running infrastructure. If your cron job or laptop is off at 9am, nothing goes out, and nothing tells you.

## Bluesky limits to plan around

| What | Limit |
| --- | --- |
| Text per post | 300 characters, counted as you'd count them by eye (an emoji is one) |
| Images per post | 4 |
| Video per post | 1, and not in the same post as images |
| Links | Need facets to be clickable |
| Threads | No set limit; each post is a reply to the one before |

Check a draft against the limit with our [character counter](/tools/character-counter), which counts the way Bluesky does.

In Postbase, images go on the first post of a thread. Postbase doesn't add alt text or post video to Bluesky yet, so for posts where either matters, publish from the Bluesky app.

## Common problems and fixes

**The link isn't clickable.** The post was published without facets. Tools that support Bluesky properly add them for you; if you're using a script, add a facet for each URL with its byte range.

**A thread came out as separate posts.** Each post after the first needs a `reply` reference to the thread's root and to the post before it. In a scheduling tool, make sure you added the parts as one thread, not as separate posts.

**The tool says it can't connect.** The app password was revoked, mistyped or created for a different account. Create a new one in Bluesky's settings and reconnect. Postbase emails you when a channel needs reconnecting, so a scheduled post doesn't fail silently.

**The post went out at the wrong time.** Check the time zone your tool schedules in. Postbase uses your browser's time zone and says which one in the date picker ("Publishes in Europe/London"). If you plan posts while travelling, check it matches the time zone you mean.

## Tips for scheduling on Bluesky

- **Write a separate version from X.** The limits differ (300 vs 280), and Bluesky readers tend to prefer a more casual tone.
- **Schedule threads as threads**, not as separate posts, so replies stay connected.
- **Space your posts out.** Bluesky's Following feed is chronological, so five posts in a minute bury each other.
- **Put links at the end.** The post reads better, and the link card sits under the text.

## Frequently asked questions

### Can you schedule posts in the Bluesky app?

No. As of October 2026 the Bluesky app only posts immediately. To schedule, use a tool that posts through Bluesky's API, an AI assistant connected to one, or a script.

### Is it allowed to schedule Bluesky posts with a third-party tool?

Yes. Scheduling tools post through Bluesky's official API with an app password you create, and Bluesky itself partnered with Buffer to offer scheduling in 2024.

### Can you schedule a thread on Bluesky?

Yes, with a tool that supports threads. Postbase publishes the first post at the scheduled time and each following post as a reply to the one before.

### Do scheduled Bluesky posts get less reach?

There's no sign of it. A scheduled post is published through the same API as any other, and Bluesky's Following feed simply shows posts in time order. Posting when your followers are around matters more than how the post was sent.

### What's the character limit on Bluesky?

300 characters per post. Bluesky counts the way you'd count by eye, so an emoji or an accented letter counts as one.

### Will Bluesky add native scheduling?

Maybe. It's a long-standing request, but there's no date. If it arrives, a tool is still useful for posting the same thing to X, Mastodon and LinkedIn at once.
