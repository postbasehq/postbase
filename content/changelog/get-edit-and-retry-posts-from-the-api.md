---
title: Get, edit and retry posts from the API and AI tools
date: 2026-10-10
type: new
area: Developers
summary: The REST API and MCP server can now check, edit, reschedule and retry posts, attach media and read analytics.
draft: true
---

You can now look up a post to see each channel's status, live link and any error, edit or reschedule a draft or scheduled post, and resend just the channels that failed. The same actions are available to Claude and other AI tools through the Postbase MCP server.

Posts can attach files from your media library, or from public links that Postbase copies into the library for you. You can also write different text for each channel, send an idempotency key so a repeated request never makes a second post, and pull published posts with their latest metrics from the new analytics endpoint. The full API is described in an OpenAPI spec.
