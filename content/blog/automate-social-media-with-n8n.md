---
title: Automate social media posts with n8n (X, LinkedIn, Bluesky, Mastodon)
seo_title: Automate social media posts with n8n
description: Build n8n workflows that post to X, LinkedIn, Bluesky and Mastodon through the Postbase API, from RSS, a blog or a form, with drafts to review.
date: 2026-09-27
category: Developers
related: /integrations/x, /integrations/linkedin, /blog/best-social-media-apis-for-developers
---

n8n is great at "when this happens, do that". Posting to social media is the awkward part, because every network needs its own OAuth app, token refresh and API quirks. This guide skips all that: n8n calls one API (Postbase), and Postbase handles posting to X, LinkedIn, Bluesky and Mastodon.

The same approach works in Make, Zapier or any tool that can send an HTTP request.

## What you'll build

A workflow that turns something (a new RSS item, a blog post, a row in a sheet, a form submission) into a social post, scheduled for a time you choose, on every network you've connected.

Everything the workflow creates lands on your Postbase calendar. If you'd like a human to check posts first, have n8n save **drafts** instead of scheduling.

## Step 1: connect your accounts and get an API key

1. Sign up for Postbase (7-day free trial) and connect your accounts on the **Channels** page.
2. Open **Developers** and create an API key. Name it "n8n" so you know where it's used. The key is shown once, so copy it now.

## Step 2: store the key in n8n

In n8n, create a credential of type **Header Auth**:

- **Name:** `Authorization`
- **Value:** `Bearer pb_live_...` (your key)

Now every HTTP Request node can use it without the key appearing in the workflow itself.

## Step 3: find your channel ids

Add an **HTTP Request** node:

- **Method:** GET
- **URL:** `https://www.postbase.so/api/v1/channels`
- **Authentication:** Generic Credential Type → Header Auth → your credential

Run it once. The response lists each connected account with its `id` and `platform`. Copy the ids of the channels you want to post to.

## Step 4: create the post

Add another **HTTP Request** node after your trigger:

- **Method:** POST
- **URL:** `https://www.postbase.so/api/v1/posts`
- **Authentication:** your Header Auth credential
- **Body content type:** JSON
- **Body:**

```json
{
  "body": "{{ $json.title }} {{ $json.link }}",
  "channel_ids": ["<x channel id>", "<bluesky channel id>", "<mastodon channel id>"],
  "scheduled_at": "{{ $now.plus({ hours: 1 }).toISO() }}"
}
```

That schedules the post an hour from now. Leave out `scheduled_at` to save a **draft** instead, which you can review and schedule from the Postbase calendar.

To post a **thread**, send `thread` instead of `body`:

```json
{
  "thread": ["First post", "Second post", "Third post with the link"],
  "channel_ids": ["<x channel id>"],
  "scheduled_at": "{{ $now.plus({ hours: 1 }).toISO() }}"
}
```

On LinkedIn, the parts after the first become the first comment.

## Example workflows

### New blog post → social posts

**RSS Feed Trigger** (your blog's feed) → **HTTP Request** (create post). Use the item's title and link in the body. Schedule it a couple of hours out, so you have time to tweak it on the calendar.

### Weekly roundup from a spreadsheet

**Schedule Trigger** (every Monday 8am) → **Google Sheets** (read this week's rows) → **HTTP Request** (one post per row, each with its own `scheduled_at`).

### Let AI write it, let a human approve it

**Trigger** → **AI node** (write a short post from the source text) → **HTTP Request** (create a **draft**, no `scheduled_at`). Someone checks the drafts on the calendar and schedules the good ones.

## Things to watch

- **Character limits differ:** 280 on X, 300 on Bluesky, 500 on Mastodon, 3,000 on LinkedIn. One `body` goes to every channel in the request, so either keep it short, or send one request per network with its own text. Check lengths with our [character counter](/tools/character-counter).
- **Media:** the API posts text and threads today. To add an image or video, save a draft and attach it in the Postbase composer.
- **Duplicates:** if your trigger can fire twice for the same item, add a **Remove Duplicates** node (or check a "posted" column) before the HTTP Request. X in particular rejects identical posts.
- **Timezones:** `scheduled_at` is ISO 8601. `$now.toISO()` includes your n8n instance's timezone offset, so the time is exact.

## Prefer AI tools to workflows?

If you'd rather ask for posts in plain language than build a workflow, connect Claude, Claude Code or Cursor to Postbase instead. See [the AI tools page](/ai).
