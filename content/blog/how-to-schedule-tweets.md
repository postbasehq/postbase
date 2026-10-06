---
title: How to schedule tweets on X (and threads)
seo_title: How to schedule tweets and threads on X
description: How to schedule posts on X on the web and iPhone, where to find them afterwards, what X's scheduler can't do (threads, polls, Android), and how to schedule whole threads.
date: 2026-09-27
updated: 2026-10-06
category: Guides
related: /integrations/x, /mcp/x, /ai/claude/x, /tools/character-counter, /blog/hypefury-alternative-for-x
---

X has a basic scheduler built into its composer. It's fine for a single post now and then. For threads, several networks at once, or a week of posts planned in one sitting, a scheduling tool does more.

This guide covers both, plus the limits that catch people out. It was checked on 6 October 2026. X changes its composer often, so the buttons may have moved slightly.

## Schedule a post on x.com

1. Go to **x.com** and click **Post** (or use the compose box at the top of your timeline).
2. Write your post and add any images, a GIF or a video.
3. Click the **calendar icon** at the bottom of the compose box.
4. Pick a date and time, then click **Confirm**.
5. Click **Schedule**.

## Schedule a post on your phone

In September 2026, X started rolling scheduled posts out to its **iPhone app**: write the post, tap the calendar icon and pick a time. The **Android app** doesn't have it yet, so on Android, use x.com in your phone's browser.

Drafts and scheduled posts don't sync between the app and the web, so a post scheduled on your phone won't appear in the web list, and the other way round.

## Find, edit or delete scheduled posts

Open the compose box and click **Unsent posts**, then the **Scheduled** tab. Open a post to change its text or time, or delete it.

## The limits of X's scheduler

- **No threads.** X's scheduler is built around single posts. To schedule a whole thread, use a tool.
- **No polls.** A poll can't be scheduled; post it live.
- **No long posts on the web.** Premium subscribers can write posts longer than 280 characters, but X doesn't let you schedule those from the web.
- **Not on Android yet.** See above.
- **One network.** It won't post the same thing to Bluesky, Mastodon or LinkedIn.
- **No calendar view.** Scheduled posts are in a list, which makes it hard to see gaps in your week.

## X's limits at a glance

| What | Limit |
| --- | --- |
| Text per post | 280 characters (Premium allows longer posts) |
| How X counts | Links count as 23 characters, most emoji as 2 |
| Images per post | 4, or 1 GIF, or 1 video |
| Video length | 2 minutes 20 seconds without Premium |
| Polls | Can't be scheduled |
| Duplicate posts | X rejects the same text posted twice |

Check a post the way X counts it with our [character counter](/tools/character-counter). It also splits long text into a thread.

## Schedule tweets and threads with Postbase

1. **Connect X** on the Channels page. You approve access on X's own sign-in screen, and you don't need your own X developer account.
2. **Write the post** in the composer. Click **Add comment / post** to add the next post in a thread, and drag posts to reorder them.
3. **Pick other networks too** if you like, and adjust the wording for each.
4. **Pick a time**, or click an open slot on the calendar, and schedule it.

::demo composer network=x caption="Writing the X version of a post in Postbase, with the 280-character limit checked as you type."

Postbase publishes the first post at the time you pick and each following post as a reply to the one before, up to 25 posts. Images (up to 4) or a video go on the first post of the thread.

Two things worth knowing:

- **Posts with links are capped by plan.** X charges per post that contains a link, so Postbase includes a monthly allowance of linked posts (20 on Creator, up to 75 on Agency). Plain posts and threads are unlimited. A common habit is to put the link in the last post of a thread anyway.
- **Postbase sticks to 280 characters per post.** For longer text, write a thread.

## Let AI write and schedule them

If you write with Claude, ChatGPT or Cursor, it can schedule tweets for you through the [Postbase MCP server](/mcp/x). Add it, sign in, and ask something like:

> Turn this blog post into a 5-post X thread and schedule it for Tuesday at 9am.

It writes the thread within X's limits, schedules it, and puts it on your Postbase calendar so you can read it before it goes out. Here's [the Claude and X setup](/ai/claude/x).

## Common problems and fixes

**X says the post is a duplicate.** X rejects a post whose text matches one you've already posted. Change the wording, even slightly.

**The post is over the limit even though it looks short.** X counts every link as 23 characters and most emoji as 2. Paste it into the [character counter](/tools/character-counter) to see what X sees.

**A thread came out as separate posts.** X's own scheduler can't post threads, so each scheduled post stands alone. Schedule threads with a tool that posts each part as a reply.

**I can't see the post I scheduled on my phone.** Scheduled posts don't sync between X's app and the web. Check where you scheduled it.

**A tool stopped posting.** The connection to X was revoked or expired. Reconnect it; Postbase emails you when a channel needs reconnecting, so a scheduled post doesn't fail silently.

## Tips for scheduled tweets

- **Make the first post of a thread work on its own.** Most people only see that one.
- **Put links in the last post of a thread**, not the first.
- **Say how many posts you want** when an AI writes the thread. "A 4-post thread" beats "a thread".
- **Don't schedule the same text twice**, even weeks apart. X rejects duplicates.

## Frequently asked questions

### Can you schedule tweets on X for free?

Yes. X's web composer has a free scheduler for single posts: click the calendar icon, pick a time and click Schedule. iPhone users have it in the app too.

### Can you schedule a thread on X?

Not with X's own scheduler, which only handles single posts. A scheduling tool like Postbase publishes the first post at your chosen time and each following post as a reply to the one before.

### Can you schedule tweets on Android?

Not in the X app yet. As of October 2026 scheduling has rolled out to the iPhone app only. On Android, use x.com in a mobile browser, or a scheduling tool.

### Where do scheduled tweets go?

Into Unsent posts. Open the compose box, click Unsent posts and then the Scheduled tab to see, edit or delete them.

### Do scheduled tweets get less reach?

X hasn't said that scheduled posts are treated differently, and posts from tools go through X's official API. When your followers are online, and how good the first line is, matter far more.

### Can you schedule a poll on X?

No. Polls can't be scheduled with X's scheduler, so post them live.
