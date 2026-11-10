---
title: "Claude Code hooks: post a changelog every time you ship"
seo_title: "Claude Code hooks: announce every release"
description: How Claude Code hooks work (events, matchers, exit codes, JSON), plus two copyable hooks that turn every release into social posts you approve.
date: 2026-11-10
category: AI agents
related: /ai/claude-code, /blog/claude-code-subagents, /blog/announce-releases-with-claude-code, /blog/claude-code-agent-teams
---

**Claude Code hooks are shell commands (or HTTP calls, prompts or subagents) that Claude Code runs automatically at set points, such as before or after a tool call, when a prompt is submitted or when Claude stops.** You define them in `.claude/settings.json`. Unlike instructions in a prompt, a hook always runs, which makes it the right place for things that must happen every time.

This guide covers how hooks work, then builds one useful hook: every time Claude Code publishes a release, the release is turned into announcement posts in Postbase, saved as drafts for you to approve. Written against the Claude Code hooks reference on 10 November 2026.

## How Claude Code hooks work

A hook has three parts: the **event** that triggers it, an optional **matcher** that narrows it down, and the **handler** that runs.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(gh release create *)",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/release-nudge.sh"
          }
        ]
      }
    ]
  }
}
```

That reads: after a Bash tool call succeeds (`PostToolUse`, `matcher: "Bash"`), if the command was `gh release create …` (`if`), run this script.

The events you'll use most:

| Event | Fires | Can it block? |
| --- | --- | --- |
| `SessionStart` | When a session starts or resumes | No; output becomes context |
| `UserPromptSubmit` | When you send a prompt, before Claude sees it | Yes |
| `PreToolUse` | Before a tool runs | Yes, it can deny the call |
| `PostToolUse` | After a tool succeeds | No, but it can tell Claude something |
| `Stop` | When Claude finishes its reply | Yes, it can make Claude keep going |
| `SubagentStop` | When a subagent finishes | Yes |
| `TaskCompleted`, `TeammateIdle` | In [agent teams](/blog/claude-code-agent-teams) | Yes |
| `Notification` | When Claude Code sends a notification | No |

## Matchers and the `if` field

- **`matcher`** filters by tool name: `Bash`, `Edit|Write`, or a regex such as `mcp__postbase__.*`. Leave it out to match everything.
- **`if`** filters by the arguments, using permission-rule syntax: `Bash(git push *)`, `Bash(gh release create *)`. It takes exactly one rule and works on tool events only.

You can't put `Bash(git push *)` in `matcher`; it would be treated as a regex. Use `if` for that.

## What a hook receives and returns

A command hook gets a JSON object on **stdin**: the session id, the working directory, the event name and, for tool events, `tool_name` and `tool_input` (for Bash, the `command`).

It answers with its **exit code** and, optionally, JSON on stdout:

| Exit code | Meaning |
| --- | --- |
| 0 | Success. If stdout is a JSON object, Claude Code reads it |
| 2 | Block. Stderr is fed back to Claude as the reason |
| Anything else | A non-blocking error; the action goes ahead |

Useful JSON fields: `systemMessage` (a note shown to you), and `hookSpecificOutput.additionalContext` (text added to Claude's context). `$CLAUDE_PROJECT_DIR` points at your project root.

Hooks can live in `~/.claude/settings.json` (all projects), `.claude/settings.json` (shared with your team) or `.claude/settings.local.json` (just you, not committed).

## Hook 1: when you release, have Claude write the announcement

The first hook doesn't post anything itself. When Claude runs `gh release create`, the hook adds a note to Claude's context asking it to write announcement drafts. Claude writes better posts than a script, and the posts go to Postbase as drafts, so nothing is published until you approve it.

**Before you start**, connect your accounts in Postbase and add its MCP server to Claude Code:

```bash
claude mcp add --transport http postbase https://mcp.postbase.so/mcp
```

The [social media subagent](/blog/claude-code-subagents) is a good companion: it knows each network's limits and how to call Postbase.

**Create `.claude/hooks/release-nudge.sh`** and make it executable (`chmod +x`). It needs `jq`:

```bash
#!/usr/bin/env bash
# Runs after Claude creates a GitHub release. Asks Claude to draft announcements.
cmd=$(jq -r '.tool_input.command')
tag=$(printf '%s' "$cmd" | sed -nE 's/.*gh release create[[:space:]]+([^[:space:]]+).*/\1/p')
[ -z "$tag" ] && exit 0

jq -n --arg tag "$tag" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Release " + $tag + " was just published. Read its notes with `gh release view " + $tag + "`, then write announcement posts for X, LinkedIn and Bluesky and save them as drafts in Postbase. Do not schedule them.")
  }
}'
```

**Add the hook to `.claude/settings.json`** (the JSON at the top of this guide). Now, whenever Claude publishes a release in your session, its next step is writing the announcement:

1. You: "Tag v2.4 and create the GitHub release with notes from the changelog."
2. Claude runs `gh release create v2.4 …`.
3. The hook fires and tells Claude about the release.
4. Claude reads the notes, writes a version for each network and calls Postbase's `create_post` without a time, which saves drafts.
5. You open Postbase, read the drafts, and schedule them.

::demo calendar caption="The drafts land in Postbase, where you edit them and pick a time. Nothing goes out until you do."

## Hook 2: save a draft through the API, no AI involved

If you'd rather the announcement didn't depend on Claude at all, a hook can call Postbase's REST API directly. This one saves a short draft with the release name and link; you write the rest in Postbase.

Create an API key on Postbase's AI & API page and note the channel ids you want (from `GET /api/v1/channels`). Export them in your shell before starting Claude Code:

```bash
export POSTBASE_API_KEY=pb_live_...
export POSTBASE_CHANNELS=ch_x_id,ch_linkedin_id,ch_bluesky_id
```

**`.claude/hooks/release-draft.sh`:**

```bash
#!/usr/bin/env bash
# Runs after Claude creates a GitHub release. Saves a Postbase draft.
set -euo pipefail
cmd=$(jq -r '.tool_input.command')
tag=$(printf '%s' "$cmd" | sed -nE 's/.*gh release create[[:space:]]+([^[:space:]]+).*/\1/p')
[ -z "$tag" ] && exit 0

url=$(gh release view "$tag" --json url -q .url)
body="$tag is out. Here's what's new: $url"
channels=$(jq -cn --arg c "$POSTBASE_CHANNELS" '$c | split(",")')

jq -n --arg body "$body" --argjson ch "$channels" '{body: $body, channel_ids: $ch}' |
  curl -sS -X POST https://www.postbase.so/api/v1/posts \
    -H "Authorization: Bearer $POSTBASE_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: release-$tag" \
    --data @- > /dev/null

jq -n --arg tag "$tag" '{systemMessage: ("Saved a Postbase draft announcing " + $tag + ".")}'
```

Point the hook in `.claude/settings.json` at this script instead. Leaving out `scheduled_at` makes the post a draft, and the `Idempotency-Key` means running the release twice never creates two drafts. The full request format is in the [API docs](https://docs.postbase.so).

## Test a hook without releasing anything

Hooks are just scripts, so feed them the JSON Claude Code would send:

```bash
echo '{"tool_input":{"command":"gh release create v2.4 --notes-file NOTES.md"}}' \
  | .claude/hooks/release-nudge.sh
```

You should see the JSON with your release tag. For the API version, use a test tag and delete the draft afterwards. Inside Claude Code, the `/hooks` menu lists every hook that's active.

## Variations

- **Announce on push to main** instead of on release: change `if` to `Bash(git push origin main*)` and have the nudge ask Claude to summarise the commits since the last push.
- **Block risky commands**: a `PreToolUse` hook with `if: "Bash(git push --force*)"` that exits with code 2 stops Claude force-pushing.
- **Check posts before they're created**: a `PreToolUse` hook on `mcp__postbase__create_post` can reject posts that contain banned words or go over a length, by exiting 2 with the reason.

## Things to know

- **Hooks only see what Claude does.** If you run `gh release create` yourself in a terminal, or your CI creates releases, the hook doesn't fire. For CI, call the Postbase API from your release workflow instead.
- **Hooks run with your permissions.** Read any hook script before you trust it, especially in a project's shared `.claude/settings.json`, which runs for everyone on the team.
- **Keep them fast.** Command hooks time out after 10 minutes by default; for slow work, set `"async": true` so Claude doesn't wait.

## Frequently asked questions

### What are hooks in Claude Code?

Commands, HTTP calls, prompts or subagents that Claude Code runs automatically at points in a session, such as before or after a tool call, when you submit a prompt or when Claude stops. They're configured in settings.json.

### Where do I put Claude Code hooks?

In the `hooks` section of `.claude/settings.json` for a project you share, `.claude/settings.local.json` for a project but only you, or `~/.claude/settings.json` for all your projects.

### How do I run a hook only for certain commands?

Use `matcher` for the tool name (for example `Bash`) and the `if` field for the arguments, such as `Bash(gh release create *)`.

### How does a hook block an action?

Exit with code 2 from a `PreToolUse` hook, and write the reason to stderr. Claude sees the reason and the tool call doesn't run.

### Can a Claude Code hook post to social media?

Yes. A hook can call a scheduler's API directly, such as Postbase's REST API, or add context asking Claude to write and save posts through an MCP server. Saving drafts keeps a person in charge of what's published.

### What's the difference between hooks and subagents?

Hooks run automatically at fixed points and always fire. Subagents are assistants Claude chooses to hand work to. They work well together: a hook can tell Claude a release happened, and a subagent can write the posts.
