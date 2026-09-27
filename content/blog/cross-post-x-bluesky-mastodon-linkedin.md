---
title: How to cross-post to X, Bluesky, Mastodon and LinkedIn without it looking copy-pasted
seo_title: Cross-post to X, Bluesky, Mastodon and LinkedIn
description: One draft, a version per network: how to cross-post to X, Bluesky, Mastodon and LinkedIn with each network's limits and habits in mind.
date: 2026-09-26
category: Guides
related: /integrations/bluesky, /integrations/mastodon, /tools/character-counter
---

Most people now post to more than one network: X, Bluesky, Mastodon, LinkedIn, often all four. The lazy way is to paste the same text everywhere. It works, but it shows. A thread cut off mid-sentence on Bluesky, a LinkedIn post that reads like a tweet, hashtags that do nothing on X.

The better way is **one draft, several versions**. This guide shows how.

## The networks are different

| | Limit | Threads | Links | Tone |
|---|---|---|---|---|
| X | 280 (weighted) | Yes | Count as 23 characters | Short, punchy |
| Bluesky | 300 | Yes | Need facets to be clickable | Casual, conversational |
| Mastodon | 500 (most instances) | Yes | Count as 23 characters | Plain, no marketing speak |
| LinkedIn | 3,000 | No (use the first comment) | Often go in the first comment | Longer, professional |

Check any post against all of these at once with our [character counter](/tools/character-counter).

## Start with the longest version

Write the fullest version first, usually for LinkedIn. It's easier to cut down than to pad out. Then make the short versions:

- **X:** the one sentence that matters, plus the link. Or a thread if there's more to say.
- **Bluesky:** similar to X, but you have 300 characters and can be a bit more relaxed.
- **Mastodon:** plain and direct. A couple of relevant hashtags at the end help people find it.
- **LinkedIn:** the full story, in short paragraphs, with the link in the first comment.

## Cross-posting with Postbase

1. **Pick all your channels** at the top of the composer.
2. **Write the main version** in the "All channels" tab.
3. **Open each network's tab** and adjust the wording where it matters. Each tab shows that network's character limit as you type.
4. **Add a thread** for X, Bluesky and Mastodon if you need more room. On LinkedIn, the extra parts become the first comment.
5. **Schedule it once.** Every version goes out at the same time.

::demo composer network=bluesky caption="One draft, with a separate version for each network. Each is checked against its own limit."

## Or let the agent write the versions

The Postbase agent, or Claude over MCP, can write the versions for you:

> Announce our new feature on X, Bluesky, Mastodon and LinkedIn. Keep X short, make LinkedIn a proper post with the link in the first comment, and schedule everything for Tuesday at 9am.

::demo agent prompt="Announce our new feature on X, Bluesky and LinkedIn for Tuesday at 9am." channels=x,bluesky,linkedin reply="Here's a version for each network, sized to fit. They're set for Tuesday at 09:00."

Read what it writes before it goes out. It's quick to fix a word, and it's how you teach it your voice.

## Habits that make cross-posting look native

- **Don't @mention across networks.** A handle on X means nothing on Mastodon.
- **Skip hashtags on X and LinkedIn**, or keep them to one. Use a few on Mastodon, where they drive discovery.
- **Stagger by a few minutes** if you like, but posting together is fine. Different audiences see different networks.
- **Reply where the conversation happens.** Scheduling the post is half the job; the replies are where people get to know you.
