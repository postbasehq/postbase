---
title: Can you schedule posts on Bluesky? Here's how
description: Bluesky's app has no built-in scheduling. These are the ways to schedule Bluesky posts and threads anyway, from a scheduling tool to a few lines of code.
date: 2026-09-27
category: Guides
related: /integrations/bluesky, /ai/claude/bluesky, /blog/bluesky-api-post
---

**Short answer: not in the Bluesky app itself.** As of September 2026, the official Bluesky app publishes posts the moment you hit Post, and there's no scheduling option in its settings or help centre. You can still schedule Bluesky posts, though. You just need something that posts for you at the right time.

Here are your options, from easiest to most hands-on.

## Option 1: a scheduling tool

A scheduler connects to your Bluesky account and posts through Bluesky's official API at the time you choose. This is the easiest route, and it's the only one that also handles threads, images and cross-posting to other networks.

With Postbase:

1. **Create an app password** in Bluesky: Settings → Privacy and security → App passwords. App passwords let a tool post for you without your main password, and you can revoke one any time.
2. **Connect Bluesky** on the Postbase Channels page with your handle and the app password.
3. **Write your post** in the composer. Click **Add post** to turn it into a thread.
4. **Pick a time** and schedule it.

::demo composer network=bluesky caption="Writing a Bluesky version of a post in Postbase. The 300-character limit is checked as you type."

Links are made clickable automatically. That matters on Bluesky, which doesn't turn URLs into links by itself.

## Option 2: post from Claude or another AI tool

If you already write with Claude, Cursor or Claude Code, you can let it schedule Bluesky posts for you. Add the Postbase MCP server, sign in, and ask:

> Write a 3-post Bluesky thread about our launch and schedule it for Wednesday at 6pm.

Everything it schedules lands on your Postbase calendar first. Here's [the Claude and Bluesky setup](/ai/claude/bluesky).

## Option 3: write a script

Bluesky is the easiest network to post to from code: no developer account, no app review, no fees. A small script run by cron or a scheduled GitHub Action can post at a set time. You'll need to:

- sign in with `com.atproto.server.createSession` and an app password
- create the post with `com.atproto.repo.createRecord`
- add **facets** yourself if you want links to be clickable
- chain `reply` references for a thread

We walk through all of it, with code, in [How to post to Bluesky with the API](/blog/bluesky-api-post). The catch is that you're now running infrastructure: if your cron job or laptop is off at 9am, nothing goes out.

## Tips for scheduling on Bluesky

- **Mind the 300-character limit.** It counts what you'd count by eye, so an emoji is one. Check with our [character counter](/tools/character-counter).
- **Write a separate version from X.** The limits differ (300 vs 280), and Bluesky readers tend to be more casual.
- **Add alt text to images.** Bluesky users notice, and screen readers depend on it.
- **Schedule threads as threads**, not as separate posts, so replies stay connected.

## Will Bluesky add native scheduling?

Maybe. It's a common request, and many other networks have it now. Until it does, a scheduler or a script is the way. If it does arrive, a tool is still handy for posting the same thing to X, Mastodon and LinkedIn at once.
