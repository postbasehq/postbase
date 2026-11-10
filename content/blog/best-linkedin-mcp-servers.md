---
title: The best LinkedIn MCP servers in 2026
seo_title: Best LinkedIn MCP servers in 2026
description: "The LinkedIn MCP servers worth using in 2026: official-API servers that post safely versus ones that log in as you, with features, prices and risks."
date: 2026-11-10
category: AI agents
related: /mcp/linkedin, /blog/what-is-an-mcp-server, /blog/best-mcp-servers-for-social-media, /blog/write-linkedin-posts-with-claude
---

**There's no official LinkedIn MCP server for Claude, Cursor or most AI tools, so every LinkedIn MCP server is a third-party one, and they fall into two very different groups.** Servers built on LinkedIn's official API (Postbase, Upload-Post, Ayrshare, Postiz) can post and schedule safely but can't read your feed or messages. Servers that log in as you through a browser session (such as the popular open-source stickerdaniel server) can read profiles, jobs and messages, but LinkedIn's terms forbid that kind of automation and accounts can be restricted.

Below is what each kind can do, the servers worth knowing, and how to pick. Checked on 10 November 2026. Postbase is our product; it's listed with the same criteria and limits as the others.

## Two kinds of LinkedIn MCP server

| | Official API servers | Log-in-as-you servers |
| --- | --- | --- |
| How they connect | LinkedIn's own sign-in screen (OAuth) | Your browser session, cookies or password |
| Post and schedule | Yes | Some can |
| Read your feed, profiles, jobs, messages | No: LinkedIn's API doesn't offer this to apps | Yes |
| Send messages and connection requests | No | Yes |
| Risk to your account | Low: this is what LinkedIn's API is for | Real: LinkedIn bans automated access |
| Examples | Postbase, Upload-Post, Ayrshare, Postiz | stickerdaniel/linkedin-mcp-server, Linked API, Unipile |

If you want AI to **write and post** for you, an official API server does the job without putting your account at risk. If you want it to **research people, search jobs or handle messages**, only the log-in-as-you servers can, and you're accepting LinkedIn's rules on automation when you use them.

## Official API servers (posting and scheduling)

### Postbase

A hosted MCP server for LinkedIn, X, Bluesky, Mastodon and YouTube. You connect LinkedIn in Postbase with LinkedIn's own sign-in, then add one URL to Claude, ChatGPT, Cursor or Claude Code and sign in to Postbase; there's no API key to copy. The AI gets ten tools: list channels, create or schedule posts (with a different version per network), check and edit what's queued, cancel, retry, read analytics and attach media from your library.

On LinkedIn it can post a **first comment** for you (send two parts and the second becomes the comment), attach up to 20 images, and it refuses posts over 3,000 characters with the reason, so the AI can fix them.

**Price:** from $29 a month for 5 channels, with a 7-day trial; the MCP server, API and an in-app AI agent are on every plan.
**Limits:** personal profiles only, text and images. No company pages or video on LinkedIn yet.
**More:** the [LinkedIn MCP server page](/mcp/linkedin).

::demo mcp caption="Postbase's AI & API page, with the setup for each AI tool. The same server posts to LinkedIn, X, Bluesky, Mastodon and YouTube."

### Upload-Post

An upload API for creators and developers covering 22 networks, with a hosted MCP server and Claude Code skills. It posts to LinkedIn through the official API, and its documentation covers posting to company pages.

**Price:** free for 2 profiles and 10 uploads a month; Basic $24 a month ($16 billed yearly) for 5 profiles. The MCP server is on every plan.
**Best for:** developers pushing video and posts to many networks from code or agents.

### Ayrshare

A social media API for businesses and platforms that post on behalf of their own users, with an MCP server authenticated by API key.

**Price:** Premium $149 a month for one profile (up to 14 accounts across its networks), Launch $299 for up to 10 profiles.
**Best for:** products that need to post for many customers; expensive for one person's accounts.

### Postiz

An open-source scheduler (AGPL) with a hosted MCP server, an API and support for 30+ networks, including LinkedIn pages. Self-host it for free or use the cloud version from $29 a month for 5 channels ($23 billed yearly), with the MCP server and API on every plan.

**Best for:** people who want open source and the widest network coverage.

### Automation bridges: Zapier and Composio

Zapier's MCP server and Composio expose thousands of app actions to AI tools, LinkedIn's "create post" among them, through each service's own LinkedIn connection. Useful if you already use them, but you're paying per action or task, and you don't get a calendar or per-network limits checking.

## Log-in-as-you servers (research, messages, outreach)

### stickerdaniel/linkedin-mcp-server

The most popular open-source LinkedIn MCP server, with over 4,000 stars on GitHub. It drives a real browser using your LinkedIn session and gives the AI tools to read profiles and companies, search people and jobs, read your feed, and read and send messages and connection requests. It doesn't create posts.

Its own README is clear about the risk: LinkedIn's User Agreement prohibits automated access, accounts using automated tools can be restricted or banned, and there's no guarantee of account safety.

**Best for:** personal research and job hunting, on an account you can afford to lose.

### Hosted session services: Linked API, Unipile and others

Cloud services that run your LinkedIn account in a browser or connect with your password or cookies, aimed at sales and recruiting outreach. They're convenient and capable, and carry the same risk: LinkedIn's help centre says members using such tools risk having their accounts restricted or shut down.

## How to choose a LinkedIn MCP server

1. **What do you need the AI to do?** Write and schedule posts: an official API server. Read people's profiles or your inbox: a session server, with the risk.
2. **Whose account is it?** Never connect a session-based server to the LinkedIn account your job depends on.
3. **Profiles or pages?** If you post to a company page, check the server supports it. Postbase doesn't yet; Upload-Post and Postiz do.
4. **Other networks?** If the same post goes to X or Bluesky, a server that covers them saves connecting several.
5. **Does it keep you in control?** Look for drafts, a calendar to review scheduled posts, and a way to revoke the AI's access in one click.

Our guide to [letting an AI agent post safely](/blog/let-an-ai-agent-post-safely) goes deeper on the last point, and [the best MCP servers for social media](/blog/best-mcp-servers-for-social-media) compares servers across every network.

## Frequently asked questions

### Is there an official LinkedIn MCP server?

Not for Claude, Cursor or most AI tools. LinkedIn's own AI integrations are limited to a few apps, so LinkedIn MCP servers are built by third parties, either on LinkedIn's official API or by logging in as you.

### Can Claude post to LinkedIn?

Yes, through an MCP server that posts via LinkedIn's official API, such as Postbase. You connect LinkedIn once, add the server to Claude, and ask it to write and schedule a post. Our guide to [writing LinkedIn posts with Claude](/blog/write-linkedin-posts-with-claude) walks through it.

### Is using a LinkedIn MCP server against LinkedIn's terms?

Servers that post through LinkedIn's official API are using LinkedIn's API as intended. Servers that automate your logged-in account through a browser or cookies conflict with LinkedIn's User Agreement, which prohibits automated access, and accounts can be restricted.

### Can a LinkedIn MCP server read my feed or messages?

Only the log-in-as-you kind. LinkedIn's official API doesn't let apps read your feed or inbox, so posting-focused servers can't.

### Can an MCP server post to a LinkedIn company page?

Some can, including Upload-Post and Postiz. Postbase posts to personal profiles only for now.

### Do I need a LinkedIn developer account?

Not with a hosted server. You sign in with LinkedIn's normal screen inside the service, which uses its own approved LinkedIn app.
