---
title: Webhooks
date: 2026-10-10
type: new
area: Developers
summary: Get a signed request to your own server when a post publishes, partly publishes or fails, or a channel needs reconnecting.
draft: true
---

Add an endpoint in **Developers → Webhooks**, choose the events you want, and send a test to check it works. Each request is signed so you can verify it came from Postbase, and a delivery that fails is retried several times over the following hours. You can see each endpoint's last delivery on the same card.

Webhooks can also be managed through the REST API.
