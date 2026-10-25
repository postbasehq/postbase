---
title: How to turn one YouTube video into a week of social posts
seo_title: Repurpose a YouTube video into LinkedIn, X and Shorts posts
description: Turn one YouTube video into a LinkedIn post, an X thread, Bluesky and Mastodon posts, and Shorts and TikToks, using the transcript and Claude.
date: 2026-10-25
category: AI agents
related: /integrations/youtube, /blog/how-to-schedule-youtube-videos-and-shorts, /blog/write-linkedin-posts-with-claude, /blog/how-to-write-an-x-thread, /integrations/tiktok
---

A good YouTube video takes days to make and is usually promoted with one post that says "new video is up". That wastes most of the work. The same video holds a LinkedIn post, an X thread, a few short posts and two or three vertical clips, all of which can send people back to the full video.

This guide shows a workflow that turns one video into a week of posts in about an hour, using the transcript, Claude (or any AI tool you like) and a scheduler. It was written on 25 October 2026.

## What one video can become

| From the video | Becomes | Where |
| --- | --- | --- |
| The main idea | A story-led post with a lesson | LinkedIn |
| The steps or key points | A thread of 5 to 10 posts | X, Bluesky, Mastodon |
| A surprising fact or quote | A single short post | X, Bluesky, Mastodon |
| 2 or 3 strong moments | 30 to 60 second vertical clips | YouTube Shorts, TikTok |
| The thumbnail or a key frame | An image post | LinkedIn, X |
| The whole thing | A blog post or newsletter | Your site |

You don't need all of these. Pick the three or four that fit the networks you actually use.

## Step 1: get the transcript

On YouTube, open the video, expand the description and click **Show transcript**. Click the three dots in the transcript panel to turn timestamps off, then select it all and copy it. If you made the video, you can also download the captions file from **YouTube Studio**, under **Subtitles**.

Keep the timestamps version too if you plan to cut clips. It tells you exactly where each moment is.

## Step 2: find the moments worth posting

This is the step most people skip, and it's what separates useful posts from summaries. Paste the transcript into Claude and ask:

> Here's the transcript of my YouTube video. Find the 5 moments that would work best as standalone social posts: a surprising fact, a strong opinion, a clear how-to, a story, a number. For each, quote the line, give the timestamp, and say in one sentence why it would work on its own.

Read the list and choose. You know your audience better than the model does.

## Step 3: write a version for each network

Ask for each format separately, so each gets proper attention. Give Claude your voice profile if you have one (here's [how to build one](/blog/write-linkedin-posts-with-claude)).

**LinkedIn:**

> Using moment 2, write a LinkedIn post in my voice. Lead with the story, end with the lesson, under 1,300 characters. Don't mention the video in the post: the link will go in the first comment.

**X thread:**

> Turn the steps from moments 1 and 3 into an X thread of 6 to 8 posts, each under 280 characters. The first post should make people want to read the rest without clickbait. Put the video link only in the last post.

**Bluesky and Mastodon:**

> Write a single post from moment 4 for Bluesky (under 300 characters) and a slightly longer one for Mastodon (under 500), with two relevant hashtags in CamelCase for Mastodon.

Then edit each one yourself. Check facts against the transcript; AI tools sometimes blur what was actually said.

## Step 4: cut vertical clips

For each of your two or three strongest moments, cut a 30 to 60 second clip:

1. **Start on the hook.** Cut the first sentence of build-up; begin on the line that grabs attention.
2. **Crop to 9:16** and keep your face or the action in the middle.
3. **Add captions.** Most short videos are watched without sound.
4. **End cleanly**, ideally with a line that makes people want the full video.

Most video editors (CapCut, DaVinci Resolve, Descript, Premiere) can do this, and the YouTube mobile app can turn part of one of your long videos into a Short with **Edit into a Short**. The same clip can go to YouTube Shorts and TikTok.

## Step 5: schedule the week

Spread the posts out so the video keeps getting attention all week, rather than everything going out on launch day:

| Day | What goes out |
| --- | --- |
| Day 1 | The video, plus a short post on X, Bluesky and Mastodon |
| Day 2 | The LinkedIn post, link in the first comment |
| Day 3 | First Short and TikTok |
| Day 4 | The X thread |
| Day 5 | Second Short and TikTok |
| Day 7 | A single quote or fact post |

In Postbase you can schedule all of it from one calendar:

- **Upload the video once** and pick both YouTube and TikTok; write a caption for each. The first line of your post becomes the YouTube title.
- **Write the LinkedIn post** and click **Add comment / post** to put the video link in the first comment.
- **Build the thread** in the composer with **Add comment / post** for each part, then pick X, Bluesky and Mastodon. Each network's limit is checked as you type, and you can adjust the wording per network.
- **Pick a time for each**, or click open slots on the calendar.

::demo composer network=youtube caption="Scheduling a video in Postbase. The first line becomes the YouTube title; the same upload can go to TikTok."

## Let the agent do steps 2 to 5

If you'd rather not run the prompts yourself, paste the transcript into the **Postbase agent** with a single request. It drafts a version for each network and shows you the posts before anything is scheduled:

::demo agent prompt="Here's the transcript of my new video. Write a LinkedIn post with the video link in the first comment for Tuesday, an X thread for Thursday, and short posts for Bluesky and Mastodon on Wednesday." channels=linkedin,x,bluesky,mastodon caption="The Postbase agent turning a transcript into posts for four networks. You review them before they're scheduled."

You can do the same from Claude, ChatGPT or Cursor through the [Postbase MCP server](/mcp). Ask it to save the posts as drafts if you want to check them in Postbase first.

## Tips that make repurposed posts work

- **Each post must stand alone.** Someone who never watches the video should still get something from the post.
- **Don't say "in my latest video" in every post.** Lead with the idea; mention the video at the end or in the comments.
- **Reuse the best moments again later.** A strong clip can go out again in two or three months. Postbase can repeat a post every week, two weeks or month.
- **Track which formats send viewers.** Postbase shows how each post did; YouTube Studio shows where viewers came from. Do more of what works.

## Frequently asked questions

### How do I repurpose a YouTube video for LinkedIn?

Copy the video's transcript, pick the strongest single idea, and write a story-led LinkedIn post about it that stands on its own. Put the video link in the first comment. AI tools like Claude can draft it from the transcript if you give them examples of your writing.

### How do I get a YouTube video's transcript?

Open the video, expand the description and click **Show transcript**. Turn off timestamps from the panel's menu, then copy the text. For your own videos you can also download captions in YouTube Studio under Subtitles.

### Can I post the same clip to YouTube Shorts and TikTok?

Yes. A vertical clip under a minute works on both. In Postbase you can upload it once, pick both channels and write a different caption for each.

### Can AI turn a YouTube video into social posts automatically?

It can draft them. Paste the transcript into Claude or the Postbase agent and ask for a version per network. Always check the drafts against what was said in the video, and edit them into your own voice before they go out.

### How many posts can one video become?

Typically five to ten: a LinkedIn post, a thread, a few single posts and two or three short clips. That's a week of content from one video.

### Should I post the video link in every post?

No. Posts that stand on their own and mention the video at the end, or in the first comment, usually do better than posts that just announce the video.
