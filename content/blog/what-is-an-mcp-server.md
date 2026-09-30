---
title: What is an MCP server? A plain-English guide for marketers
seo_title: What is an MCP server? A guide for marketers
description: MCP lets AI tools like Claude and ChatGPT use your other software. What an MCP server is, how it works and what it means for social media.
date: 2026-09-25
category: AI agents
related: /ai, /ai/claude
---

If you've seen "MCP" on a product page lately and nodded along, this one's for you. It's a simple idea with a clumsy name, and it's quietly changing how people use AI tools at work.

## The short version

**MCP (Model Context Protocol) is a standard way for AI tools to use other software.** An **MCP server** is the piece a product builds so that AI tools can plug into it.

Before MCP, an AI assistant could only work with what you pasted into the chat. With MCP, you can connect Claude to your calendar, your docs or your social media scheduler, and it can look things up and take actions there, with your permission.

A useful comparison is USB. Before USB, every printer and keyboard had its own plug. After it, one port worked for everything. MCP does the same for AI tools: a product builds one MCP server, and it works with Claude, ChatGPT, Cursor and any other tool that supports the standard.

## Where it came from

Anthropic, the company behind Claude, published MCP as an open standard in November 2024. Other AI companies adopted it through 2025, and in December 2025 it moved to the Linux Foundation's Agentic AI Foundation, co-founded by Anthropic, Block and OpenAI, so no single company owns it. It's now supported by most of the major AI tools, including Claude, ChatGPT, Cursor, VS Code with GitHub Copilot and Gemini CLI.

## How it works, in three parts

1. **The AI tool** (the "client"): Claude, ChatGPT, Cursor and so on. This is where you type.
2. **The MCP server**: the connector a product provides. It describes a set of **tools**, which are the actions the AI is allowed to take, like "create a post" or "list scheduled posts".
3. **You**: you decide which servers to connect, and you sign in to each one. The AI can only do what the server's tools allow, in the account you connected.

When you ask Claude to "schedule this for Tuesday", Claude sees that the connected server has a tool for scheduling posts, fills in the details (the text, the channels, the time) and asks the server to run it. The server does the work and reports back.

::demo tools caption="The tools Postbase's MCP server gives an AI tool. The AI can only do what's on this list."

## What "tools" means in practice

Tools are the most important part to understand, because they're the limits on what the AI can do. A well-designed MCP server gives the AI a small set of clear actions. Postbase's server, for example, has four:

- list your connected social accounts
- create a draft, or a scheduled post or thread
- list what's scheduled
- cancel a scheduled post

That's deliberately narrow. An AI connected to Postbase can't delete your posts, disconnect your accounts or change your billing, because there are no tools for those things.

## Remote servers vs local servers

You'll see two kinds of MCP server:

- **Remote (hosted) servers** live on the internet at a URL. You paste the URL into your AI tool and sign in in a browser window. No files, no keys. This is the easiest kind for most people.
- **Local servers** run on your own computer, usually installed with a command like `npx`. They typically use an API key that you put in a config file. Developers like them for scripting and testing.

Many products, including Postbase, offer both.

## Why marketers should care

MCP turns an AI chat into somewhere you can actually get work done. Some examples of what that looks like for social media:

- **Repurposing.** "Turn this blog post into an X thread and a LinkedIn post, and schedule both for next week."
- **Launch days.** "Announce the release on X, Bluesky and LinkedIn at 9am, with a shorter version for X."
- **Checking the plan.** "What's going out this week? Is anything scheduled on the bank holiday?"
- **Fixing mistakes.** "Cancel the LinkedIn post at 5pm, the link is wrong."

The AI writes the posts and handles the busywork. Your scheduler handles the posting, and you can still see and edit everything before it goes out.

## Is it safe?

It's as safe as the tools the server exposes and the checks you put around them. Four things to look for:

1. **Sign-in, not shared passwords.** Good remote servers use OAuth, so you approve access in a browser window and never hand over a password.
2. **Narrow tools.** Fewer, clearer actions mean fewer surprises.
3. **A place to review.** Posts should land in a calendar or queue you can check, not go straight out.
4. **A way to revoke.** You should be able to cut off an AI tool's access in one click.

::demo revoke caption="In Postbase, every connected AI tool is listed on the AI & API page and can be revoked in one click."

We go into more detail in [How to let an AI agent post for you without losing control](/blog/let-an-ai-agent-post-safely).

## How to try it

The quickest way is to connect a social media scheduler to the AI tool you already use. With Postbase and Claude, it takes about a minute: [here's the step-by-step guide](/blog/post-to-social-media-from-claude). For other tools, see the [AI tools page](/ai).
