---
title: "ChatGPT MCP: how to connect MCP servers to ChatGPT"
seo_title: "ChatGPT MCP: how to add a custom MCP server (2026 steps)"
description: How to connect a custom MCP server to ChatGPT in 2026, which plans can use write actions, the exact steps in Plugins, OAuth, local servers, and fixes when the option is missing.
date: 2026-11-10
category: AI agents
related: /ai/chatgpt, /blog/what-is-an-mcp-server, /blog/best-mcp-servers-for-social-media, /mcp
---

**To connect an MCP server to ChatGPT, open Plugins in ChatGPT on the web, select the plus button, choose "Add custom MCP server", enter the server's HTTPS URL and authentication, and create it as a plugin.** Full MCP support, including tools that change things (write actions), is available on ChatGPT Business and Enterprise/Edu. ChatGPT Pro can connect custom servers with read-only access. It works on the web only, and only with remote servers.

Below are the steps, what each plan can do, and how to fix the usual problems, based on OpenAI's help article [Connecting custom MCP servers in ChatGPT](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt), checked on 10 November 2026. OpenAI changes this area often, so check that article if a label has moved.

## Which ChatGPT plans support MCP

| Plan | Custom MCP servers | Write actions (create, update, schedule) | Who sets it up |
| --- | --- | --- | --- |
| Enterprise / Edu | Yes | Yes | Admins, owners and members an admin authorises |
| Business | Yes | Yes | Admins and owners |
| Pro | Yes | No: read and fetch only | You |
| Plus and Free | Not listed in OpenAI's help article | No | |

So if you want ChatGPT to **do** things through an MCP server, such as creating a task, updating a CRM or scheduling a post, you need a Business or Enterprise/Edu workspace. On Pro, ChatGPT can read through the server (search, fetch, list) but not change anything.

## How to add a custom MCP server to ChatGPT

In ChatGPT on the web:

1. Go to **Plugins**.
2. Select the **plus button**, then **Add custom MCP server**.
3. Enter a **name** and, optionally, a description.
4. Under **Connection**, enter the server's public **HTTPS MCP endpoint URL**. (For a private server, choose **Tunnel**; see below.)
5. Configure **authentication**: OAuth if the server supports it, or none for public servers.
6. Read the risk warning and tick **I understand and want to continue**.
7. Select **Create as a plugin**, then review the tools ChatGPT found.

If the server uses OAuth, a sign-in window opens for the service. You no longer need to turn on Developer Mode first in the current Plugins experience; you acknowledge the risk warning for each server instead.

## How to use the server in a chat

Start a new conversation, type **@** in the prompt box and pick the plugin. Then ask in plain English.

- The plugin selection applies to **that message**. For a follow-up that needs fresh data or another action, @mention it again.
- You can use several apps in one message, for example "check my calendar and draft a post about tomorrow's launch".
- For write actions, ChatGPT may **ask you to confirm** first, depending on the app's permissions and what the action would do. Some especially risky actions are blocked rather than offered for approval.

## Setting it up for a workspace (Business, Enterprise, Edu)

In a company workspace, an admin or owner (or, on Enterprise/Edu, a member an admin has authorised) connects and tests the server first, then publishes it so others can use it:

1. Connect and test the server privately, as above.
2. In the **Admin Console**, open **Plugins**, then **Manage Legacy Apps**, then **Drafts**.
3. Select **Publish** and review the safety warnings, especially for write actions.

Enterprise/Edu admins can also choose which actions a server is allowed to use and which groups can access it. Once approved, ChatGPT uses a **frozen snapshot** of the server's tools: new or changed tools don't appear until an admin refreshes and republishes.

## Local MCP servers and tunnels

ChatGPT only connects to **remote** MCP servers over HTTPS. A server running on your laptop or private network can't be added directly. OpenAI's **Secure MCP Tunnel** connects a private server without exposing it to the internet; choose **Tunnel** in the connection step.

## OAuth tips for server builders

If you run your own MCP server with OAuth, make sure it issues **refresh tokens**. OpenAI's article notes that without refresh-token support (for OpenID Connect, the `offline_access` scope), ChatGPT can lose access when the first token expires and users have to sign in again. If you change your OAuth metadata, recreate the plugin so ChatGPT reads it again.

## Example: let ChatGPT schedule social media posts

Postbase runs a hosted MCP server for scheduling posts to X, LinkedIn, Bluesky, Mastodon and YouTube.

1. Connect your social accounts in Postbase.
2. In ChatGPT, add a custom MCP server with the URL `https://mcp.postbase.so/mcp` and choose OAuth. Sign in to Postbase when the window opens; there's no API key.
3. In a chat, @mention Postbase and ask: "Turn this blog post into an X thread and a LinkedIn post, and schedule both for Tuesday at 9am."

On Business or Enterprise/Edu, ChatGPT writes the posts, asks you to confirm, and schedules them; they appear on your Postbase calendar, where you can still edit or cancel them. On Pro, the read-only tools still work: "What's scheduled this week?" or "Which of last month's posts did best?" More on the [Postbase app for ChatGPT](/ai/chatgpt).

::demo client-setup client=chatgpt caption="The MCP server URL on Postbase's AI & API page. ChatGPT appears under Connected apps once it signs in, and you can revoke it in one click."

## Why can't I add a custom MCP server in ChatGPT?

**There's no "Add custom MCP server" option.** Your plan or workspace doesn't allow it. On Business, only admins and owners can add servers; on Enterprise/Edu, an admin has to grant you permission (the workspace permission is called "Create plugins with MCPs").

**The server's write tools don't work.** You're on Pro, which allows read and fetch only, or your workspace admin has turned those actions off.

**You're on the phone app.** Custom MCP servers can only be connected on ChatGPT on the web.

**The connection fails.** Check the URL is the server's public HTTPS MCP endpoint (often ending in `/mcp`), that it isn't a local address, and that OAuth sign-in completes.

**New tools don't show up.** Workspace connections use a frozen snapshot. An admin needs to refresh the tool list and republish.

**ChatGPT keeps asking you to sign in again.** The server's OAuth isn't issuing refresh tokens. That's on the server's side.

## Frequently asked questions

### Does ChatGPT support MCP?

Yes. ChatGPT can connect to remote MCP servers from Plugins on the web. Full support, including write actions, is on Business and Enterprise/Edu; Pro can connect servers with read and fetch access.

### Can ChatGPT Plus use MCP servers?

OpenAI's help article lists Business, Enterprise/Edu and Pro for custom MCP servers, not Plus. Check the article for changes, since OpenAI updates plan access often.

### Do I need Developer Mode to add an MCP server to ChatGPT?

Not in the current Plugins experience. You add the server from Plugins and acknowledge a risk warning for it.

### Can ChatGPT connect to a local MCP server?

Not directly. ChatGPT only connects to remote servers. Use OpenAI's Secure MCP Tunnel to connect a server on a private network or your own machine.

### Can I add MCP servers in the ChatGPT mobile app?

No. Custom MCP servers can only be connected in ChatGPT on the web.

### Can ChatGPT post to social media through MCP?

Yes, on Business or Enterprise/Edu, with an MCP server that schedules posts, such as Postbase. ChatGPT asks you to confirm before it schedules, and the posts land on your Postbase calendar.

### Is it safe to connect an MCP server to ChatGPT?

Only connect servers you trust. MCP servers can expose ChatGPT to prompt injection from the data they return, and write actions change real data. Prefer servers with OAuth sign-in, clear tool lists and a way to revoke access.
