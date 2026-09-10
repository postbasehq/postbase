# Postbase

**The social scheduler even your AI can run.**

Postbase is an open-source, **MCP-native** social media scheduler. Connect your
channels, compose and schedule posts, and Postbase publishes them across every
channel on time — from a clean dashboard, or straight from the AI tools you already
work in.

- **Publishing rail, not a content generator** — it schedules and publishes; it
  doesn't write your content.
- **MCP-native** — an AI agent (Claude, Cursor, …) can drive posting through the
  [`@postbasehq/mcp`](packages/mcp) server.
- **Self-host free, or use the hosted cloud** — same product either way.

Channels (v1): **X, LinkedIn, Instagram** · YouTube next.

## Tech stack

- **Next.js (App Router) + TypeScript + Tailwind**
- **Supabase** — Postgres, Auth, Storage
- **Inngest** — scheduled publishing engine
- **`@postbasehq/mcp`** — MCP server (npm)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase (and later, platform) keys
npm run dev
```

Apply the database schema in `supabase/migrations/` (via the Supabase SQL editor
or the CLI). To run the scheduled publishing engine locally:

```bash
npm run inngest   # in a second terminal
```

## MCP server

Add Postbase to your AI client and let an agent schedule posts for you. See
[`packages/mcp`](packages/mcp) for setup. Tools: `list_channels`, `create_post`,
`list_scheduled`, `cancel_post`.

## Project layout

```
app/            Next.js routes (marketing, dashboard, /api, /api/v1)
components/     UI components
lib/            Supabase clients, Inngest, publishing adapters, API core
packages/mcp/   @postbasehq/mcp — the MCP server
supabase/       SQL migrations
legal/          Privacy Policy & Terms (source for /privacy and /terms)
```

## License

AGPL-3.0-or-later.
