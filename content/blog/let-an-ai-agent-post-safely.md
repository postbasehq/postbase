---
title: How to let an AI agent post for you without losing control
seo_title: How to let an AI agent post for you safely
description: Guardrails for letting Claude, ChatGPT or any AI agent post to your social accounts: drafts first, scoped access and one-click revoke.
date: 2026-09-23
category: AI agents
related: /ai, /ai/claude
---

Letting an AI agent post for you sounds either brilliant or terrifying, depending on who you ask. It can be brilliant, as long as you set it up so a bad post gets caught before it goes out, and a misbehaving connection can be switched off in seconds.

These are the rules we recommend, roughly in the order you should put them in place.

## 1. Give the agent the fewest powers that work

The biggest safety decision is made before you type a single prompt: which tools the agent gets. An agent can only do what its tools allow, so pick a connection with a short, boring list.

For posting, the agent needs to:

- see which accounts it can post to
- find files you've already uploaded, to attach them
- create a draft or a scheduled post
- see what's queued
- cancel something it got wrong

It doesn't need to delete published posts, disconnect accounts, invite people to your workspace or touch billing. If a tool offers those to an AI, think twice.

::demo tools caption="Postbase gives AI tools nine tools and nothing else. There's no delete, disconnect or settings tool to misuse."

## 2. Connect with a sign-in, not a shared password

Never give an AI tool your social media passwords. Connect it through a service that uses OAuth, where you approve access in a browser window and can take it back later.

The same goes for API keys: if you do use one, give each tool its own key with a label like "Claude on my laptop", so you can revoke one without breaking the others.

## 3. Drafts first, for at least a week

For the first week, tell the agent to save everything as a draft:

> Write the posts, but save them as drafts. Don't schedule anything.

Read what it writes. You'll quickly learn where it's reliable (summaries, trimming to length, reformatting for each network) and where it needs help (your tone of voice, facts it can't check, anything time-sensitive). Once the drafts consistently need only light edits, let it schedule.

## 4. Always go through a calendar

An agent that posts straight to X is fine for a quick one-off, but anything regular should go through a calendar or queue that a human looks at. That gives you a window between "the agent scheduled it" and "the world can see it".

::demo calendar caption="Posts an agent schedules in Postbase sit on the same calendar as yours, where you can open, edit or cancel them."

A simple habit: check the week's calendar every Monday morning, and look at anything scheduled in the next hour before a big launch.

## 5. Tell it your rules, once

Most bad AI posts come from missing context, not bad intentions. Write your rules down once and reuse them: in a Claude Project's instructions, a Claude Code slash command, or a note you paste at the start of a chat. For example:

- Our voice: plain, friendly, no hype words, no exclamation marks.
- Never mention prices, discounts or dates unless I give them to you.
- Never @mention people or companies unless I ask.
- No more than one hashtag, and only on LinkedIn.
- If you're not sure something is true, leave it out and tell me.

## 6. Keep it away from the risky stuff

Some posts should always be written or at least approved by a person:

- anything about a crisis, an outage or an apology
- replies to customers or journalists
- legal, financial or medical claims
- anything involving someone else's name or photo

An agent is great for the routine 80%: announcements, repurposing, reminders, the weekly roundup. Keep the rest for humans.

## 7. Know how to switch it off

Before you connect anything, find the off switch. You should be able to see every AI tool connected to your account and revoke each one on its own.

::demo revoke caption="Every connected AI tool is listed on Postbase's AI & API page. Revoking one cuts it off immediately, and posts it already scheduled stay on your calendar."

Revoking should stop new actions straight away but leave what's already scheduled in place, so you can decide what to keep.

## 8. Review the connection list every month

Connections pile up: a Cursor you tried once, a Claude Desktop on an old laptop, a teammate's test. Once a month, open the list of connected apps and revoke anything you don't recognise or no longer use.

## A setup we'd recommend

Putting it together, a sensible setup looks like this:

1. Connect your accounts to a scheduler with a calendar, such as [Postbase](/ai).
2. Add its MCP server to your AI tool with a sign-in, not a key.
3. Write your voice and rules into a reusable instruction.
4. Drafts only for the first week.
5. Scheduling after that, with a Monday check of the calendar.
6. A monthly look at connected apps.

That keeps the time savings and removes most of the risk. The agent does the writing and busywork, and you keep the final say.

Ready to try it? Here's [how to connect Claude to your social accounts](/blog/post-to-social-media-from-claude).
