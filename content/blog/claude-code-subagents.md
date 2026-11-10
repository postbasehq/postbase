---
title: "Claude Code subagents: a social media subagent you can copy"
seo_title: "Claude Code subagents: how they work, plus one you can copy"
description: How Claude Code subagents work (files, frontmatter, tools, models, MCP), and a ready-to-copy social media subagent that drafts and schedules posts through Postbase.
date: 2026-11-10
category: AI agents
related: /ai/claude-code, /blog/claude-code-agent-teams, /blog/announce-releases-with-claude-code, /mcp
---

**Claude Code subagents are specialised assistants defined in Markdown files in `.claude/agents/`. Each runs in its own context window with its own instructions, tools and model, does one job, and returns a short summary to your main conversation.** Claude hands a task to a subagent when it matches the subagent's `description`, or when you name it with `@agent-name`.

This guide explains how subagents work, then gives you one to copy: a social media subagent that reads your repo, writes posts for each network and schedules them in Postbase, without filling your coding session with drafts and tool output. Written against the Claude Code docs on 10 November 2026.

## How Claude Code subagents work

A subagent is a Markdown file with YAML front matter and a system prompt:

```markdown
---
name: code-reviewer
description: Reviews code for quality and security. Use after code changes.
tools: Read, Grep, Glob
model: sonnet
---

You are a code reviewer. Analyse the changes and give specific,
actionable feedback on correctness, security and readability.
```

What happens when it runs:

- **Fresh context.** It doesn't see your conversation. It gets its own prompt, the task Claude gives it, your CLAUDE.md files and a git status snapshot.
- **Its own tools.** Only what `tools` allows (or everything except `disallowedTools`).
- **Its own model.** `sonnet`, `opus`, `haiku`, a full model ID, or `inherit` for your session's model.
- **A summary back.** Your main conversation gets the result, not every file read or tool call along the way. That's the main reason to use one: long, noisy work stays out of your context.

## Where subagent files live

| Location | Scope |
| --- | --- |
| `.claude/agents/` | This project; commit it so your team gets it |
| `~/.claude/agents/` | Every project on your machine |
| A plugin's `agents/` folder | Wherever the plugin is enabled |
| `--agents` flag (JSON) | The current session only |
| Managed settings | Your whole organisation |

If two have the same `name`, the more specific location wins (managed settings first, then the CLI flag, the project, your user folder and plugins). Claude Code watches these folders, so edits apply within seconds.

## The front matter fields that matter

Only `name` and `description` are required. The ones you'll actually use:

| Field | What it does |
| --- | --- |
| `name` | The subagent's id, used in `@agent-name` |
| `description` | When Claude should use it. Write it as a trigger: "Use when the user asks to…" |
| `tools` | Allowed tools, e.g. `Read, Grep, Glob`. MCP tools use `mcp__server__tool`, and `mcp__server__*` allows a whole server |
| `disallowedTools` | Tools to remove, applied before `tools` |
| `model` | `sonnet`, `opus`, `haiku`, a model ID, or `inherit` |
| `permissionMode` | `default`, `acceptEdits`, `plan` and others; your session's mode can override it |
| `mcpServers` | MCP servers only this subagent loads, so your main session never carries their tool descriptions |
| `skills` | Skills loaded into its context at start |
| `maxTurns` | A cap on how long it can work |
| `effort`, `color`, `memory`, `isolation`, `background` | Reasoning effort, display colour, persistent memory, a temporary git worktree, and always-in-background |

Claude Code also ships built-in subagents: **Explore** (fast, read-only codebase search), **Plan** (research while planning) and **general-purpose** (multi-step tasks with every tool).

## A social media subagent you can copy

This subagent turns "announce what we shipped" into scheduled posts. It reads your changelog and commits, writes a version for each network within its character limit, checks what's already queued, and schedules through Postbase's MCP server.

**1. Connect Postbase** (once). Connect your X, LinkedIn, Bluesky or Mastodon accounts in Postbase, then add the server to Claude Code:

```bash
claude mcp add --transport http postbase https://mcp.postbase.so/mcp
```

The first time a Postbase tool runs, a browser window opens to sign in. There's no API key to store.

::demo client-setup client=claude-code caption="Connecting Claude Code on Postbase's AI & API page. It appears under Connected apps, where you can revoke it at any time."

**2. Create `.claude/agents/social-media.md`:**

```markdown
---
name: social-media
description: Writes and schedules social media posts about this project. Use when the user asks to announce, post, tweet or share something, or to check or change what's scheduled.
tools: Read, Grep, Glob, Bash, mcp__postbase__*
model: sonnet
---

You write and schedule social media posts for this project through Postbase.

Sources
- Base every post on something in the repo: CHANGELOG.md, docs/, the README,
  or commits (git log). Never describe a feature you can't find there.
- Only run git commands that read history. Don't change any files.

Writing
- One version per network, each within its limit:
  X 280 characters, Bluesky 300, Mastodon 500, LinkedIn 3,000.
- X: one idea, no hashtags. LinkedIn: 3 to 5 short paragraphs with a
  concrete first line. Bluesky and Mastodon: plain and friendly.
- No emojis unless the user asks. Put links at the end.

Scheduling
1. Call list_channels to get channel ids.
2. Call list_scheduled and avoid times already taken.
3. Call create_post once per announcement, with a version per network in
   channel_bodies and a unique idempotency_key.
4. If the user didn't give a time, save drafts (omit scheduled_at).
   Always use the user's time zone in scheduled_at.

Finish by listing each post's network, time and full text.
```

**3. Use it.** In Claude Code, either let Claude pick it up from your request:

```text
Announce v2.4 on X, LinkedIn and Bluesky for tomorrow at 10am London time.
```

or call it by name:

```text
@agent-social-media what's scheduled for next week? Move anything on Friday to Thursday.
```

Claude hands the job to the subagent, which does the reading, writing and tool calls in its own context, then reports back with the final posts. Your main conversation stays about your code.

## Why `create_post` should still ask you

Subagents' permission prompts appear in your main session. Leave `mcp__postbase__create_post` out of your allowed tools and Claude Code asks before every post is created, so you read each one first. If you'd rather review in Postbase, tell it to save drafts: they wait on your calendar until you schedule them.

The read-only tools are safe to allow in `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["mcp__postbase__list_channels", "mcp__postbase__list_scheduled", "mcp__postbase__get_analytics"]
  }
}
```

Postbase's MCP server can't delete accounts or change settings, and you can revoke Claude Code's access from the AI & API page in one click. More on that in [letting an AI agent post safely](/blog/let-an-ai-agent-post-safely).

## Variations worth making

**A read-only analytics reporter.** Same file, but `tools: mcp__postbase__get_analytics, mcp__postbase__list_channels` and a prompt that summarises last week's best and worst posts and suggests one change. It can't post anything.

**A release announcer with a fixed format.** Tighten the writing rules to your house style and add "Read the latest git tag and the commits since the previous one." Pair it with a slash command, as in our guide to [announcing releases from Claude Code](/blog/announce-releases-with-claude-code).

**A scoped MCP connection.** If you don't want Postbase's tools in your main session at all, define the server inside the subagent with `mcpServers`, so only the subagent loads it. Inline servers in a project's `.claude/agents/` load after you trust the folder.

## Subagents, agent teams, slash commands or skills?

| | Use it when |
| --- | --- |
| Subagent | One focused job whose details you don't need in your main context |
| Agent team | Several agents need to discuss and check each other's work |
| Slash command | You run the same prompt repeatedly and want to type it once |
| Skill | Claude should know how to do something whenever it's relevant |

For a team where a writer and an editor argue over drafts before anything is scheduled, see [Claude Code agent teams](/blog/claude-code-agent-teams).

## Frequently asked questions

### What are subagents in Claude Code?

Specialised assistants defined in Markdown files. Each has its own system prompt, tools and model, works in a separate context window, and returns a summary to your main conversation.

### How do I create a subagent in Claude Code?

Create a Markdown file in `.claude/agents/` (for the project) or `~/.claude/agents/` (for all projects) with `name` and `description` in the front matter and the instructions below it. Claude Code picks it up within seconds.

### How do I call a specific subagent?

Mention it with `@agent-name`, ask for it by name ("use the social-media subagent to…"), or start a whole session as it with `claude --agent name`.

### Can subagents use MCP servers?

Yes. They inherit your MCP tools unless you restrict them with `tools` or `disallowedTools`, and the `mcpServers` field can give a subagent servers your main session doesn't load.

### Can subagents spawn other subagents?

Yes, by default up to three levels below your main conversation. Remove the Agent tool from a subagent's `tools` to stop it.

### Which model do subagents use?

The `model` in their front matter, or your session's model if it's `inherit` or not set. You can also set `CLAUDE_CODE_SUBAGENT_MODEL` to change the default.

### Can a Claude Code subagent post to social media?

Yes, through an MCP server such as Postbase's. The subagent writes the posts and calls `create_post` to schedule them or save drafts, and Claude Code asks for your approval unless you've allowed the tool.
