---
title: How to schedule LinkedIn posts (with and without a tool)
seo_title: How to schedule LinkedIn posts (profile and Page)
description: LinkedIn has built-in scheduling up to 3 months ahead. How to use it on desktop, mobile and company Pages, what it can't do, and when a tool is worth it.
date: 2026-09-27
updated: 2026-10-06
category: Guides
related: /integrations/linkedin, /mcp/linkedin, /ai/claude/linkedin, /tools/character-counter, /tools/best-time-to-post
---

Good news first: you don't need any tool to schedule a LinkedIn post. LinkedIn has built-in scheduling on desktop, in the app and on company Pages. This guide shows how to use it, the limits that trip people up, what it can't do, and when a scheduling tool is worth it.

Everything here was checked against LinkedIn's help centre on 6 October 2026.

## Schedule a LinkedIn post on desktop

1. Click **Start a post** at the top of your feed.
2. Write your post and add any images.
3. Click the **clock icon** next to the Post button.
4. Pick a date and time, then click **Next**.
5. Check the preview and click **Schedule**.

From your personal profile you can schedule anywhere from **10 minutes to 3 months** ahead. The time picker moves in 30-minute steps, but you can type an exact time.

## Schedule a LinkedIn post on mobile

1. Tap **Post** and write your post.
2. Tap the **clock icon** in the top right of the Share post screen.
3. Pick a date and time and tap **Next**.
4. Tap **Schedule**.

## Schedule a post on a LinkedIn company Page

Page admins (super admins and content admins) can schedule from the Page itself:

1. Open your Page and click **Start a post**.
2. Write the post, then click the **clock icon** next to Post.
3. Pick a date and time and click **Schedule**.

Pages have tighter rules than profiles. A Page post can be scheduled from **one hour to three months** ahead, and LinkedIn won't schedule **multi-photo posts, reshares, polls, events, jobs or service posts** for a Page. Those have to go out live.

## Find, edit or cancel a scheduled post

Open the post window, click the clock icon, and choose **View all scheduled posts** in the lower left. From each post's **More** menu you can change the time, edit the post or delete it. On a Page, scheduled posts are listed in the Page's admin view, where you can reschedule or edit them the same way.

## LinkedIn's limits at a glance

| What | Limit |
| --- | --- |
| Post text | 3,000 characters |
| Visible before "see more" | The first two or three lines |
| How far ahead (profile) | 10 minutes to 3 months |
| How far ahead (Page) | 1 hour to 3 months |
| Can't be scheduled on a Page | Multi-photo posts, reshares, polls, events, jobs, services |
| First comment | Can't be scheduled natively |

Check a draft against the 3,000-character limit with our [character counter](/tools/character-counter).

## What LinkedIn's scheduler can't do

- **Schedule the first comment.** The comment that usually holds your link has to be added by hand once the post is live.
- **Post the same thing elsewhere.** It only schedules to LinkedIn, so your X, Bluesky or Mastodon version is a separate job in a separate app.
- **Show your whole week.** Scheduled posts sit in a list, not on a calendar next to everything else you're posting.
- **Some post types on Pages.** Polls, reshares and multi-photo posts can't be scheduled for a Page at all.

## When a scheduling tool is worth it

If LinkedIn is the only place you post, the built-in scheduler is fine. A tool starts to pay off when:

- **You post to several networks.** Write once, then adjust the LinkedIn version and the shorter X or Bluesky versions side by side.
- **You want the link in the first comment**, posted automatically a moment after the post.
- **You plan in batches.** A calendar makes it easy to see gaps and keep a steady rhythm.
- **You'd like AI to do the first draft**, and schedule it for you.

::demo composer network=linkedin caption="The Postbase composer with a LinkedIn version of the post. Each network's character limit is checked as you type."

## How to schedule LinkedIn posts with Postbase

1. **Connect LinkedIn** on the Channels page. You sign in on LinkedIn's own screen; Postbase never sees your password.
2. **Write the post** in the composer, with up to 20 images.
3. **Add the first comment.** Click **Add comment / post** and put your link there. Postbase publishes it as the post's first comment, a moment after the post.
4. **Pick a time**, or click an open slot on the calendar, and schedule it.

Postbase posts to personal LinkedIn profiles today. Company Pages and video are on the roadmap, so for those, use LinkedIn's own scheduler for now.

## Let AI write and schedule them

If you write with Claude, ChatGPT or Cursor, you can let it schedule LinkedIn posts through the [Postbase MCP server](/mcp/linkedin). Ask something like:

> Turn this customer story into a LinkedIn post in my voice, put the case study link in the first comment, and schedule it for Tuesday at 8am.

It drafts the post, sends the link as the first comment, and schedules it on your Postbase calendar, where you can read it before it goes out. Here's [how to connect Claude to LinkedIn](/ai/claude/linkedin).

## Common problems and fixes

**You can't schedule a Page post.** On a Page, LinkedIn won't schedule polls, reshares or multi-photo posts, and you need to be a super admin or content admin. Post those live, or ask a super admin for access.

**A tool's posts stopped going out.** LinkedIn connections expire after a while, and LinkedIn asks you to sign in again. Postbase emails you when a channel needs reconnecting, so a scheduled post doesn't fail silently.

**The post went out at the wrong time.** Check the time zone you scheduled in. Postbase uses your browser's time zone and says which one in the date picker ("Publishes in Europe/London"), which is worth a glance if you plan posts while travelling.

## Tips for LinkedIn posts that get read

- **Front-load the point.** Only the first few lines show before "see more".
- **Short paragraphs.** One or two sentences each, with a blank line between.
- **Put the link in the first comment** if you want the post itself to read cleanly.
- **Keep a steady rhythm.** A few posts a week at times your network is online beats bursts followed by silence. Our [best time to post tool](/tools/best-time-to-post) shows when that is, in your time zone.

## Frequently asked questions

### Can you schedule posts on LinkedIn without a tool?

Yes. LinkedIn has built-in scheduling on desktop and mobile. Click the clock icon next to the Post button, pick a date and time, and click Schedule.

### How far ahead can you schedule a LinkedIn post?

Up to three months. From a personal profile the earliest is 10 minutes from now; from a company Page it's one hour.

### Can you schedule a LinkedIn first comment?

Not with LinkedIn's own scheduler. Scheduling tools like Postbase can publish the first comment automatically, a moment after the post.

### Can you schedule polls or multi-photo posts on a LinkedIn Page?

No. LinkedIn doesn't allow scheduling polls, reshares, multi-photo posts, events, jobs or service posts on a Page. They have to be posted live.

### Do scheduled LinkedIn posts get less reach?

LinkedIn hasn't said that scheduled posts are treated differently, and posts from scheduling tools go through LinkedIn's official API. What you post and when your network is online matter far more.

### Can I schedule LinkedIn posts from Claude?

Yes. Connect Claude to Postbase over MCP, connect your LinkedIn account in Postbase, and ask Claude to write and schedule the post. It appears on your Postbase calendar before it goes out.
