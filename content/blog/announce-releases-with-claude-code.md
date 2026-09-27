---
title: Announce every release from Claude Code
description: Set up Claude Code to read your changelog, write launch posts for X, LinkedIn and Bluesky, and schedule them with a reusable slash command.
date: 2026-09-24
category: AI agents
related: /ai/claude-code, /integrations/x, /integrations/bluesky
---

Most developers are bad at announcing what they ship. Not because they don't want to, but because by the time the release is out, writing three versions of the same post for three networks is the last thing anyone wants to do.

Claude Code already knows what changed. It can read the diff, the changelog and the commit messages. Give it a way to post and the announcement becomes one more step in the release, not a chore for later.

This guide connects Claude Code to Postbase and adds a reusable `/announce` command.

## Step 1: connect your accounts to Postbase

Create a Postbase account and connect the accounts you announce on, usually X, LinkedIn, Bluesky and maybe Mastodon. Every plan starts with a 7-day free trial.

## Step 2: add the MCP server to Claude Code

Run this once in your terminal:

```bash
claude mcp add --transport http postbase https://mcp.postbase.so/mcp
```

The first time Claude Code uses the server, it opens a browser window so you can sign in to Postbase and pick a workspace. There's no API key to store.

::demo client-setup client=claude-code caption="The same command is on the Developers page, and Claude Code shows up under Connected apps once it signs in."

**Prefer an API key?** Create one on the Postbase Developers page and use the npm package instead:

```bash
claude mcp add postbase --env POSTBASE_API_KEY=pb_live_... -- npx @postbasehq/mcp
```

**Sharing with your team?** Add `--scope project` to either command. Claude Code writes the server into `.mcp.json` in your repo so everyone on the team gets it. With the hosted version, each person signs in with their own Postbase account, so no secret ends up in git.

## Step 3: try it

In a Claude Code session in your repo, ask:

> Read CHANGELOG.md and write a release announcement for v2.3: a short post for X, a longer one for LinkedIn and one for Bluesky. Save them as drafts.

Claude reads the file, writes three posts sized for each network (280 characters on X, 300 on Bluesky, up to 3,000 on LinkedIn) and saves them as drafts in Postbase. Open the Postbase calendar or drafts list to read them.

When you trust the output, drop "save them as drafts" and give it a time instead:

> …and schedule them for 10am tomorrow.

## Step 4: make it a slash command

Typing that prompt every release gets old. Claude Code runs custom slash commands from Markdown files in `.claude/commands/`. Create `.claude/commands/announce.md`:

```markdown
Write a release announcement for $ARGUMENTS.

1. Read CHANGELOG.md (or, if there isn't one, the commits since the
   previous git tag) and pick the two or three changes users will care
   about most. Skip refactors and internal fixes.
2. Write one post per network, each as a separate Postbase post:
   - X: under 280 characters. If it needs more, make a thread of at most 4 posts.
   - Bluesky: under 300 characters.
   - LinkedIn: 3 to 5 short paragraphs, no hashtags, link at the end.
3. Use list_channels to find the channel ids, then create_post for each.
4. Save them as drafts unless I gave you a time, then schedule them for that time.
5. Show me the final text of each post.
```

Now every release is:

```
/announce v2.3, schedule for 10am tomorrow
```

Commit the file and the whole team gets the same command.

## Step 5 (optional): check the queue from the terminal

Because the server also lets Claude read and cancel scheduled posts, you can manage launch week without leaving the terminal:

> What have we got scheduled for launch week?

> The X post at 10am mentions the wrong version number. Cancel it.

Cancelled posts go back to drafts, so nothing is lost.

## Tips for release posts that don't read like a changelog

- **Lead with what the user can now do**, not what you changed. "You can now export to CSV" beats "Added CSV export endpoint".
- **One idea per post.** If the release has five highlights, that's a thread, not one crowded post.
- **Put the link last on LinkedIn** and in the final post of an X thread.
- **Tell Claude your voice.** Add a line to the command like "Write like a person talking to other developers. No exclamation marks, no emoji, no hype words."

## What it can't do yet

The MCP tools post text and threads, so if you want a screenshot or a demo video on the post, ask Claude to save a draft and add the media in the Postbase composer before scheduling. And while Claude can draft TikTok and YouTube captions, those networks need a video before anything can be scheduled.

## Using Cursor or VS Code instead?

The same server works in [Cursor](/ai/cursor), [VS Code](/ai/vscode) and [Windsurf](/ai/windsurf). The prompt above works as-is in any of them.
