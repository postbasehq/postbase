---
title: "Claude Code MCP servers: how to add them, and which ones to use"
seo_title: "Claude Code MCP: how to add MCP servers (and which to use)"
description: How to add MCP servers to Claude Code with claude mcp add (HTTP and stdio), scopes and .mcp.json, sign-in with /mcp, environment variables, limits and fixes, plus the servers worth installing.
date: 2026-11-10
category: AI agents
related: /ai/claude-code, /mcp, /blog/claude-code-subagents, /blog/what-is-an-mcp-server
---

**To add an MCP server to Claude Code, run `claude mcp add --transport http <name> <url>` for a remote server, or `claude mcp add <name> -- <command>` for a local one.** Add `--scope project` to share it with your team through a `.mcp.json` file in the repo. Inside Claude Code, `/mcp` shows each server's status and handles sign-in.

This guide covers the commands, scopes, sign-in, configuration and the problems people hit, then lists servers worth adding. Written against the Claude Code MCP docs on 10 November 2026.

## Add a remote MCP server (HTTP)

Most hosted servers use HTTP. One command:

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

If the server signs you in with OAuth, Claude Code opens a browser the first time you use it, or you can run `/mcp` and choose **Authenticate**. If the server uses an API key instead, pass it as a header:

```bash
claude mcp add --transport http my-api https://api.example.com/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

SSE is deprecated. Newer Claude Code versions try HTTP first and fall back to SSE if a server only supports that; use `--transport sse` only to force it.

## Add a local MCP server (stdio)

Local servers run as a process on your machine. Put the command after `--`:

```bash
claude mcp add --transport stdio airtable \
  --env AIRTABLE_API_KEY=YOUR_KEY \
  -- npx -y airtable-mcp-server
```

Everything after `--` goes to the server unchanged. Without it, the server's own flags (like `--port`) are read as Claude Code's options.

One gotcha: if the server name comes straight after `--env`, Claude Code reads the name as another variable. Put another option (such as `--transport stdio`) between them, as above.

## Scopes: just you, this project, or everywhere

| Scope | Where it's available | Stored in | Shared? |
| --- | --- | --- | --- |
| `local` (default) | This project, just you | `~/.claude.json` | No |
| `project` | This project, everyone | `.mcp.json` in the repo | Yes, through git |
| `user` | All your projects | `~/.claude.json` | No |

```bash
claude mcp add --scope project --transport http postbase https://mcp.postbase.so/mcp
```

Use `project` for servers the whole team needs, such as your issue tracker or scheduler; commit `.mcp.json`. Claude Code asks each person to approve project servers the first time, and with OAuth servers each person signs in with their own account, so no secret goes into git. Use `user` for personal tools you want in every project.

If the same name exists in more than one scope, local wins, then project, then user.

## Manage your servers

```bash
claude mcp list              # every server and its status
claude mcp get notion        # details for one
claude mcp remove notion     # remove it
claude mcp login notion      # sign in from the shell
claude mcp logout notion     # revoke and clear stored credentials
claude mcp add-json name '{"type":"http","url":"https://example.com/mcp"}'
```

Inside a session, **`/mcp`** shows each server as connected, needing authentication, failed or pending approval, and lets you authenticate, re-authenticate, reconnect or disable a server without removing it.

Run `claude mcp logout` before `remove` if you want the token revoked on the server's side; `remove` only deletes it locally.

## Keep secrets out of `.mcp.json`

`.mcp.json` supports environment variables in `command`, `args`, `env`, `url` and `headers`:

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${API_KEY}" }
    }
  }
}
```

`${VAR}` reads the variable; `${VAR:-default}` uses a default when it's unset. Each teammate sets their own key in their shell, and the file stays safe to commit.

## Limits and settings worth knowing

- **Large tool results:** Claude Code warns above 10,000 tokens and stops at 25,000 by default. Raise it with `MAX_MCP_OUTPUT_TOKENS=50000`.
- **Slow servers:** `MCP_TIMEOUT` (milliseconds) sets how long to wait for a server to start. Tool calls still running after two minutes move to the background automatically.
- **Many servers:** Claude Code loads tool definitions on demand (tool search), so having lots of servers configured doesn't fill your context with every tool description.
- **Headless runs:** `claude -p` and the Agent SDK can't open a sign-in window. Sign in first with `/mcp` or `claude mcp login`.

## MCP servers worth adding to Claude Code

| Server | What Claude Code can do with it | Type |
| --- | --- | --- |
| GitHub | Read and create issues and pull requests, review code | Remote |
| Linear, Jira, Asana | Read tickets, update status, create tasks | Remote |
| Notion | Search and write docs | Remote |
| Sentry | Look up errors and stack traces while fixing bugs | Remote |
| Playwright | Drive a real browser to test what it built | Local |
| Your database (e.g. Postgres) | Query data while debugging (use a read-only user) | Local |
| Postbase | Write and schedule launch posts to X, LinkedIn, Bluesky, Mastodon and YouTube | Remote |

Start with the tools you already switch to while coding. Each server adds options for Claude, so a few you use every day beat a dozen you don't.

## Example: announce releases from Claude Code

Postbase's server lets Claude Code turn what you shipped into social posts:

```bash
claude mcp add --transport http postbase https://mcp.postbase.so/mcp
```

Sign in when the browser opens, then ask: "Read CHANGELOG.md and write launch posts for X, LinkedIn and Bluesky for v2.4. Save them as drafts." Claude Code writes a version for each network and saves them in Postbase for you to review. Our guides go further: a [slash command for release announcements](/blog/announce-releases-with-claude-code), a [social media subagent](/blog/claude-code-subagents) and a [hook that fires on every release](/blog/claude-code-hooks).

::demo client-setup client=claude-code caption="The one-line setup for Claude Code on Postbase's AI & API page. Claude Code appears under Connected apps once it signs in."

## Troubleshooting

**"Needs authentication".** Run `/mcp`, pick the server and choose Authenticate.

**"Failed to connect".** Check the URL (remote servers often end in `/mcp`), that a local command runs on its own in your terminal, and that any required environment variables are set. `/mcp` can retry.

**Project server not loading.** It's waiting for approval. Approve it when asked, or reset your choices with `claude mcp reset-project-choices`.

**The server's flags are being rejected.** Put `--` before the server command.

**A tool's output is cut off.** Raise `MAX_MCP_OUTPUT_TOKENS`.

## Frequently asked questions

### How do I add an MCP server to Claude Code?

Run `claude mcp add --transport http <name> <url>` for a remote server, or `claude mcp add <name> -- <command>` for a local one. Add `--scope project` to share it through `.mcp.json`.

### Where does Claude Code store MCP servers?

Local and user servers are in `~/.claude.json`; project servers are in `.mcp.json` at the root of your repo.

### How do I sign in to an MCP server in Claude Code?

Run `/mcp` in a session and choose Authenticate, or run `claude mcp login <name>` in your terminal. OAuth tokens are stored and refreshed automatically.

### What's the difference between local, project and user scope?

Local is for you in one project, project is shared with your team through `.mcp.json`, and user is for you in every project.

### Can I share MCP servers with my team?

Yes. Add them with `--scope project` and commit `.mcp.json`. Use environment variables or OAuth so no secrets end up in the repo.

### Does Claude Code still support SSE MCP servers?

Yes, but SSE is deprecated. Use HTTP where the server supports it.

### How many MCP servers can I add to Claude Code?

There's no fixed limit, and tool search loads tool definitions only when needed. Still, a few servers you use daily are better than many you don't.
