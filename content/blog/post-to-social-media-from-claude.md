---
title: How to post to X, LinkedIn and Bluesky from Claude
description: A step-by-step guide to connecting Claude to your social accounts with an MCP connector, so you can draft, schedule and cancel posts from a chat.
date: 2026-09-26
category: AI agents
related: /ai/claude, /integrations/x, /integrations/linkedin
---

Claude is good at writing posts. The annoying part has always been what comes next: copying the text out, opening each network, pasting, trimming it to fit, picking a time. With an MCP connector, Claude can do that last step itself.

This guide sets that up with Postbase. By the end you'll be able to type something like "turn this blog post into an X thread and a LinkedIn post, and schedule both for Tuesday at 9am" and find both posts waiting in your calendar.

## What you need

- **A Claude account.** Custom connectors work on every Claude plan, including Free (which allows one custom connector).
- **A Postbase account** with at least one channel connected. Every plan starts with a 7-day free trial.
- About five minutes.

You don't need an API key. Claude signs in to Postbase in a browser window, the same way you'd sign in to any app with Google.

## Step 1: connect your social accounts to Postbase

Claude never talks to X or LinkedIn directly. It talks to Postbase, and Postbase posts to the networks you've connected. So connect those first: open **Channels** in Postbase and add each account.

X, LinkedIn, TikTok and YouTube use their own sign-in screens. Bluesky uses an app password, and Mastodon uses an access token from your instance. Either way, Postbase never sees your password.

## Step 2: add Postbase as a connector in Claude

In Claude, open **Settings → Connectors → Add custom connector**. Name it Postbase and paste the server URL:

```
https://mcp.postbase.so/mcp
```

You can also copy it from the **Developers** page in Postbase, which has setup instructions for each AI tool.

::demo client-setup client=claude caption="The Developers page in Postbase: copy the connector URL, and Claude shows up under Connected apps once it signs in."

## Step 3: sign in and pick a workspace

When you add the connector, Claude opens a Postbase sign-in window. Sign in and choose the workspace Claude can post to. If you manage several brands in separate workspaces, Claude only sees the one you pick here.

That's the whole setup. The connection now appears under **Developers → Connected apps** in Postbase, where you can revoke it at any time.

## Step 4: ask for a post

Start a new chat and make sure the Postbase connector is switched on in the chat's tools menu. Then ask in plain language:

> Write an X post and a LinkedIn post announcing our new pricing page. Schedule the X one for tomorrow at 10am and the LinkedIn one for 11am.

Claude will usually check which channels you have, write the posts and then ask before it calls the tool that schedules them. It has four tools to work with:

::demo tools caption="The four tools Claude gets. It can't delete posts, disconnect accounts or change settings."

- **list_channels** tells Claude which accounts are connected, so it knows what "LinkedIn" means in your workspace.
- **create_post** saves a draft, or schedules a post or thread for a specific time.
- **list_scheduled** shows what's already queued.
- **cancel_post** pulls a scheduled post back to a draft.

## Getting a different version for each network

A single `create_post` call sends the same text to every channel you pick. That's fine for a short announcement, but LinkedIn and X usually want different posts. Just ask for it:

> Write a short X version and a longer LinkedIn version, then schedule them separately.

Claude then calls `create_post` once per network, each with its own text. The same goes for threads: ask for "a 5-post X thread" and Claude sends the posts as a thread, which Postbase publishes as a chain of replies.

Keep the character limits in mind, or ask Claude to: 280 per post on X, 300 on Bluesky, 500 on Mastodon and 3,000 on LinkedIn.

## Checking what's scheduled

Everything Claude schedules lands in your Postbase calendar next to the posts you wrote yourself.

::demo calendar caption="Posts Claude schedules sit on the same calendar as everything else."

You can open any of them in the composer to change the wording, add an image or move the time. Or ask Claude:

> What's going out this week? Cancel anything on Friday afternoon.

## What Claude can't do (yet)

- **Attach images or video.** The connector sends text posts and threads. To add media, ask Claude to save a draft, then attach the image or video in the Postbase composer.
- **Post to TikTok or YouTube on its own.** Both need a video, so Claude can draft the caption but you add the video before it's scheduled.
- **Schedule without an active plan.** Drafts always work. Scheduling needs an active plan or trial.

## Troubleshooting

**Claude says it doesn't have a Postbase tool.** Check the connector is switched on for this chat in the tools menu. Connectors can be enabled per conversation.

**"One or more channel_ids are invalid".** Claude guessed a channel id instead of looking it up. Ask it to list your channels first, then try again.

**Claude is connected to the wrong workspace.** Revoke the connection under **Developers → Connected apps**, then remove and re-add the connector in Claude and pick the right workspace when you sign in.

## Not using Claude's chat app?

The same server works in [Claude Code](/ai/claude-code), [Cursor](/ai/cursor), [VS Code](/ai/vscode), [Windsurf](/ai/windsurf) and [Gemini CLI](/ai/gemini-cli). Each page has the one-line setup for that tool.
