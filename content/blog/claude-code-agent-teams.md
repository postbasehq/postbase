---
title: "Claude Code agent teams: build a content team that drafts and schedules posts"
seo_title: "Claude Code agent teams: a content team that schedules posts"
description: A hands-on guide to Claude Code agent teams. Enable them, define a researcher, writer and editor, and have the team draft a week of social posts and schedule them in Postbase.
date: 2026-11-10
category: AI agents
related: /ai/claude-code, /mcp, /blog/announce-releases-with-claude-code, /blog/let-an-ai-agent-post-safely
---

**Claude Code agent teams let one Claude Code session, the lead, spawn several teammates that each run in their own context, share a task list and message each other directly.** They're experimental and off by default: set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to turn them on, then ask Claude for a team in plain English.

This guide builds a small content team with them: a researcher who finds what's worth posting about, a writer who drafts posts for each network, and an editor who argues with the writer until the drafts are right. The lead then schedules the approved posts in Postbase through its MCP server, so the run ends with a week of posts on your calendar, not a pile of text in your terminal. It was written against the Claude Code docs on 10 November 2026.

## What agent teams are, and how they differ from subagents

Claude Code already had [subagents](https://code.claude.com/docs/en/sub-agents): helpers that go off, do a focused job and report a result back to the main session. Agent teams are different in one important way: **teammates talk to each other**, not just to the lead.

| | Subagents | Agent teams |
| --- | --- | --- |
| Who coordinates | The main session does everything | A shared task list, plus messages between teammates |
| Communication | Report a result back to the caller | Teammates message each other directly by name |
| Context | Own context window | Own context window; each is a full Claude Code session |
| Best for | Focused jobs where only the answer matters | Work that benefits from discussion and pushback |
| Token cost | Lower | Higher: every teammate is a separate Claude instance |

Content is a good fit for a team because good posts come from disagreement: someone has to check the claims, cut the fluff and say "this hook is boring". A single session tends to approve its own drafts. An editor teammate whose only job is to find problems doesn't.

## Step 1: turn on agent teams

Agent teams are disabled by default. Add the variable to your project's `.claude/settings.json` (or your shell), and restart Claude Code:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Two things to know before you do:

- **Teams need an interactive session.** Running `claude -p` (or the Agent SDK) never spawns teammates.
- **It changes ordinary delegation.** While teams are on, any subagent Claude names launches as a teammate, so a team can form even when you didn't ask for one. Set the variable back to `0` if you'd rather have plain subagents.

By default every teammate runs inside your terminal, and you switch between them in the agent panel under the prompt. If you use tmux or iTerm2, `"teammateMode": "auto"` in `~/.claude/settings.json` gives each teammate its own split pane.

## Step 2: connect Postbase so the team can schedule

Connect your X, LinkedIn, Bluesky or Mastodon accounts in Postbase, then add its MCP server to the project:

```bash
claude mcp add --scope project --transport http postbase https://mcp.postbase.so/mcp
```

`--scope project` writes the server into `.mcp.json` in your repo. That matters here: **every teammate loads the project's MCP servers, CLAUDE.md and skills when it spawns**, so the whole team can see your channels and calendar. The first time a tool is used, a browser window opens to sign in to Postbase; there's no API key to store.

::demo client-setup client=claude-code caption="Adding Claude Code on Postbase's AI & API page. It shows up under Connected apps once it signs in, and you can revoke it in one click."

The server gives the team ten tools. The ones this guide uses:

- `list_channels`: the connected accounts and their ids.
- `get_analytics`: how recent posts performed, so the researcher can see what worked.
- `list_scheduled`: what's already queued, so new posts don't clash.
- `create_post`: save a draft or schedule a post, with a different version per network.

## Step 3: define the three roles

Teammates can be spawned from [subagent definitions](https://code.claude.com/docs/en/agent-teams#use-subagent-definitions-for-teammates), which lets you write each role once and keep its tools tight. Create three files in `.claude/agents/`.

`.claude/agents/content-researcher.md`:

```markdown
---
name: content-researcher
description: Finds what's worth posting about this week from the repo and past performance.
tools: Read, Grep, Glob, Bash, mcp__postbase__get_analytics, mcp__postbase__list_scheduled
model: sonnet
---

You research topics for this week's social posts.

1. Read CHANGELOG.md, docs/ and the commits from the last 7 days
   (git log --since="7 days ago").
2. Call get_analytics for the last 30 days, sorted by engagement, and
   note what the best posts had in common.
3. Call list_scheduled so you don't repeat anything already queued.
4. Send the writer 5 to 7 topics. For each: one sentence on what it is,
   why users care, and the exact source (file, commit or PR) so every
   claim can be checked.
```

`.claude/agents/content-writer.md`:

```markdown
---
name: content-writer
description: Drafts social posts for X, LinkedIn and Bluesky from researched topics.
tools: Read, Grep, Glob
model: sonnet
---

You write social posts from the researcher's topics.

For each topic write three versions:
- X: under 280 characters, one idea, no hashtags.
- Bluesky: under 300 characters.
- LinkedIn: 3 to 5 short paragraphs, a concrete first line, no hashtags.

Only state things the source supports. Send every draft to the editor
and revise until the editor approves it. Then send the approved set
to the lead.
```

`.claude/agents/content-editor.md`:

```markdown
---
name: content-editor
description: Fact-checks and tightens drafts before anything is scheduled.
tools: Read, Grep, Glob
model: opus
---

You are the editor. Your job is to find problems, not to be agreeable.

For each draft, check it against its source and reply to the writer with
either APPROVED or a numbered list of fixes. Reject drafts that:
- claim anything the source doesn't support,
- go over the network's character limit,
- open with a vague first line,
- sound like an ad.
Approve a draft only when you'd post it yourself.
```

Notice that **only the researcher can touch Postbase, and only to read**. The writer and editor can't create posts at all. Scheduling stays with the lead, where you see and approve every call. Claude Code adds the messaging and task tools to each teammate automatically, so you don't list them.

## Step 4: let the lead ask before it schedules

Teammate permission requests show up in the lead's session, and the lead's own tool calls ask you too unless you've allowed them. Pre-approve the read-only Postbase tools in `.claude/settings.json` so the team isn't constantly interrupting you, and leave `create_post` off the list so every post needs your yes:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "mcp__postbase__list_channels",
      "mcp__postbase__list_scheduled",
      "mcp__postbase__get_analytics"
    ]
  }
}
```

Keep the lead in the default permission mode for this. Teammates start in the lead's mode, so a lead running with `--dangerously-skip-permissions` gives every teammate the same freedom.

## Step 5: start the team

In Claude Code, in your repo, give the lead the whole job in one prompt:

```text
Create an agent team to plan next week's social posts.

Spawn three teammates:
- "researcher" using the content-researcher agent type
- "writer" using the content-writer agent type
- "editor" using the content-editor agent type

The researcher sends topics to the writer. The writer drafts posts and
works with the editor until each one is approved. Wait for your
teammates to finish before doing anything yourself.

When you have the approved posts, call list_channels, then create_post
once per topic with a version for each network (channel_bodies). Spread
them Monday to Friday next week between 9am and 11am Europe/London,
avoiding any slot list_scheduled already has. Show me each post before
you schedule it.
```

Here's what happens:

1. The lead creates a shared task list and spawns the three teammates. You'll see them in the agent panel; use the arrow keys and Enter to watch any one of them, or type to give it extra instructions.
2. The researcher reads the repo and your analytics, then messages the writer with topics.
3. The writer and editor go back and forth. This is where teams earn their cost: drafts get sent back for unsupported claims and weak first lines, without you doing the arguing.
4. The lead collects the approved posts, finds your channel ids and asks your permission for each `create_post` call. Approve them and they're on your Postbase calendar, each network with its own version.

::demo calendar caption="The team's posts land on the Postbase calendar next to everything else, where you can still edit or cancel them."

If you'd rather review in Postbase than in the terminal, tell the lead to **save drafts instead**: `create_post` without a time saves a draft. Then nothing is scheduled until you open the calendar and pick times yourself.

## Make it a weekly command

Save the prompt from Step 5 as `.claude/commands/content-week.md` and replace the dates with `$ARGUMENTS`. Then every Friday:

```text
/content-week for Monday 16 November, schedule at 9am to 11am Europe/London
```

Commit the command, the three agent files and `.mcp.json`, and anyone on your team gets the same content team. Each person signs in to Postbase with their own account, so no secret goes into git.

## Add a quality gate with a hook

Agent teams fire their own [hooks](https://code.claude.com/docs/en/hooks). `TaskCompleted` runs when a teammate marks a task done; exit with code 2 and the task stays open with your message as feedback. A small script that rejects any draft over the X limit, or any task that mentions a banned phrase, catches problems before the lead ever sees them. `TeammateIdle` works the same way when a teammate is about to stop.

## Costs and limits

- **Tokens.** Every teammate is a full Claude session with its own context, so a three-person team uses roughly three times the tokens or more. Use Sonnet for the researcher and writer and save Opus for the editor, as above. Name the model in your spawn prompt to override the agent files.
- **One team per session**, and teammates can't spawn their own teammates.
- **No resume.** `/resume` doesn't bring in-process teammates back. If you resume, ask the lead to spawn fresh ones.
- **Task status can lag.** If a task looks stuck, check whether the work is done and tell the lead to move on.
- **Keep teammates off the same files.** It doesn't come up in this workflow because only the lead writes anything, but it matters if you extend it.

## When a team is overkill

For a single announcement, one session is enough: read the changelog, write three posts, schedule them. Our guide to [announcing releases from Claude Code](/blog/announce-releases-with-claude-code) does exactly that with one slash command. Reach for a team when you're planning a batch of posts and want them checked by someone other than their author, or when you want the researcher digging through analytics while the writer works.

## Frequently asked questions

### What are Claude Code agent teams?

An experimental Claude Code feature where one session, the lead, spawns several teammates. Each teammate is a separate Claude Code session with its own context. They share a task list and can message each other directly, and you can talk to any of them.

### How do I enable agent teams in Claude Code?

Set the environment variable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `1`, in your shell or under `env` in settings.json, then restart Claude Code and ask Claude to create a team.

### What's the difference between agent teams and subagents?

Subagents do a focused job and report back to the main session. Teammates in an agent team coordinate through a shared task list and message each other, which suits work that needs discussion or review. Teams cost more tokens.

### Do teammates get my MCP servers?

Yes. Each teammate loads the same project context as a normal session, including CLAUDE.md, MCP servers and skills. Subagent definitions can restrict which tools each one can use.

### Can an agent team post to social media?

Yes, through an MCP server such as Postbase. Teammates can draft and check posts, and the lead can call `create_post` to save drafts or schedule them on X, LinkedIn, Bluesky, Mastodon and YouTube.

### How many teammates should I use?

Three to five for most work. More teammates means more tokens and more coordination. For a content team, three roles (research, writing, editing) is plenty.

### Can I stop Claude from scheduling without asking?

Yes. Don't add `create_post` to your allowed tools, and keep the lead in the default permission mode. Claude then asks before every post, or you can have it save drafts and schedule them yourself in Postbase.
