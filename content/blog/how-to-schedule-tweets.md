---
title: How to schedule tweets on X (and threads)
description: How to schedule posts on X from the web composer, where to find them afterwards, the limits of X's built-in scheduler, and how to schedule whole threads.
date: 2026-09-27
category: Guides
related: /integrations/x, /ai/claude/x, /tools/character-counter
---

X has a basic scheduler built into its composer. It's fine for a single post now and then. For threads, several networks at once, or a week of posts planned in one sitting, a scheduling tool does more.

This guide covers both. It was written on 27 September 2026; X changes its composer often, so the buttons may have moved slightly.

## Schedule a post on x.com

1. Go to **x.com** and click **Post** (or use the compose box at the top of your timeline).
2. Write your post and add any images or video.
3. Click the **calendar icon** at the bottom of the compose box.
4. Pick a date and time, then click **Confirm**.
5. Click **Schedule**.

On mobile, X has started rolling scheduling out to the iOS app. If you don't see the option in your app yet, use x.com in a browser.

## Find and edit scheduled posts

Open the compose box and click **Unsent posts**. Your scheduled posts are listed there, next to your drafts. Open one to change it, or delete it.

## The limits of X's scheduler

- **Threads.** X's help centre doesn't describe scheduling a multi-post thread, and the web composer is built around single posts. To schedule a whole thread, use a tool.
- **Longer posts.** X's help centre says you can't schedule a longer post (over 280 characters) on the web.
- **One account, one network.** It won't post the same thing to Bluesky, Mastodon or LinkedIn.
- **No calendar view.** Scheduled posts are in a list, which makes it hard to see gaps in your week.

## Schedule tweets and threads with Postbase

1. **Connect X** on the Channels page. You approve access on X's own sign-in screen.
2. **Write the post** in the composer. Click **Add post** to turn it into a thread, and drag to reorder.
3. **Pick other networks too** if you like, and adjust the wording for each.
4. **Pick a time**, or click an open slot on the calendar, and schedule it.

::demo composer network=x caption="Writing the X version of a post in Postbase, with the 280-character limit checked as you type."

Postbase publishes the first post at the time you pick and each following post as a reply to the one before, up to 25 posts, with images or video.

## Let Claude schedule them

If you write with Claude, it can schedule tweets for you. Add the Postbase MCP server to Claude, sign in, and ask something like:

> Turn this blog post into a 5-post X thread and schedule it for Tuesday at 9am.

Here's [the Claude and X setup](/ai/claude/x).

## Tips for scheduled tweets

- **Count characters the way X does.** Links count as 23 and emoji as 2. Our [character counter](/tools/character-counter) does it properly.
- **Make the first post of a thread work on its own.** Most people only see that one.
- **Put links in the last post of a thread**, not the first.
- **Don't schedule the same text twice.** X rejects duplicate posts.

Moving from Hypefury? It no longer supports X. Here's [how to switch](/blog/hypefury-alternative-for-x).
