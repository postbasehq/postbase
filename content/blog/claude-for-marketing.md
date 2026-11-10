---
title: "Claude for marketing: workflows that save hours"
seo_title: "Claude for marketing: 7 workflows to copy"
description: "Seven marketing workflows for Claude with prompts to copy: a brand voice project, repurposing, campaigns, research, copy tests, reviews and scheduling."
date: 2026-11-10
category: AI agents
related: /ai/claude, /blog/post-to-social-media-from-claude, /blog/write-linkedin-posts-with-claude, /blog/ai-for-social-media
---

**Claude is most useful in marketing for the work around the ideas: turning one piece of content into many, adapting copy to each channel in your brand's voice, planning campaigns, researching competitors, reviewing what performed, and, with a connector, scheduling the posts it writes.** The trick is to set it up once (your voice, your audience, your rules) so every request starts from your context, not from scratch.

Below are seven workflows that save marketing teams hours each week, with prompts you can copy. They work in Claude on the web, desktop and mobile. Written on 10 November 2026.

## Set up once: a brand voice project

Every other workflow gets better if Claude knows your brand. Create a **Project** in Claude and give it:

- **Project instructions:** who you are, who you sell to, how you write and what you never say. For example: "We're a B2B analytics tool for finance teams. Write plainly, in British English, short sentences, no hype words like 'revolutionary', no emojis, no hashtags."
- **Knowledge files:** your style guide, a positioning doc, your product pages, and 10 to 20 of your best past posts or emails as examples.

Start every marketing chat inside that project. Claude reads the instructions and files each time, so you stop repeating yourself and the drafts sound like you from the first try.

## Workflow 1: repurpose one piece into a week of posts

The biggest time saver. Paste a blog post, transcript or changelog and ask:

```text
Turn this article into posts for next week:
- 3 LinkedIn posts (each a different angle: the main insight, a how-to, a story)
- 5 X posts, under 280 characters, one idea each
- 3 Bluesky posts, under 300 characters
Quote real numbers from the article. Don't invent anything it doesn't say.
Give each post a one-line note on who it's for.
```

The last line matters: it makes Claude explain its choices, which makes editing faster. For video, our guide to [repurposing a YouTube video into social posts](/blog/repurpose-youtube-video-into-social-posts) has the full workflow.

## Workflow 2: plan a campaign in an afternoon

```text
We're launching [feature] on [date] to [audience].
Plan a 3-week campaign: the week before, launch week, the week after.
For each week give: the goal, the channels (LinkedIn, X, email, blog),
the key message, and a list of individual posts and emails with dates.
Then list the 3 risks you'd watch and how we'd know it's working.
```

Ask Claude to put the calendar in a table, then ask follow-ups: "Make week two lighter, the team is at a conference", "Add a customer story on day 3". Our [content calendar template](/blog/social-media-content-calendar-template) is a good format to ask for.

## Workflow 3: research competitors and the market

With web search turned on, Claude can read competitors' sites, pricing pages and recent announcements:

```text
Research how [competitor A], [competitor B] and [competitor C] position
themselves today. For each: the headline claim on their homepage, who
they target, their starting price, and one thing they say that we don't.
Link every claim to the page it came from.
```

Ask for sources every time, and click a few. Claude is a fast first pass, not the final word on a rival's price.

## Workflow 4: write copy variants to test

```text
Write 10 subject lines for this email, in 3 styles: plain benefit,
curiosity, and a number. Keep each under 50 characters. Then pick the
3 you'd test first and say why.
```

The same pattern works for ad headlines, landing page heroes and LinkedIn hooks. Asking Claude to choose and justify gives you a shortlist rather than a list.

## Workflow 5: review what performed

Export last month's social or email results as a CSV and upload it:

```text
Here are last month's LinkedIn posts with impressions, reactions,
comments and clicks. Which 5 did best on engagement rate, and what do
they have in common (topic, format, length, first line, day and time)?
What should we do more of and less of next month? Be specific.
```

Claude reads the spreadsheet itself and can build charts in an artifact. Check its arithmetic on one or two rows before you share the conclusions.

## Workflow 6: turn customer language into copy

Paste interview notes, reviews, support tickets or sales call notes:

```text
From these 20 customer reviews, list the exact phrases people use to
describe the problem we solve, the outcome they got, and their
objections before buying. Then write a landing page hero (headline and
subheading) using their words, not ours.
```

Copy written in customers' own words almost always beats copy written in a brainstorm.

## Workflow 7: schedule posts straight from the chat

Writing posts in Claude and pasting them into four apps is the slow part. With a connector, Claude can schedule them for you.

1. Connect your accounts (X, LinkedIn, Bluesky, Mastodon, YouTube) in Postbase.
2. In Claude, go to **Settings**, then **Connectors**, then **Add custom connector**. Name it Postbase and paste `https://mcp.postbase.so/mcp`.
3. Sign in to Postbase when the window opens. There's no API key.

Then, in your brand voice project:

```text
Schedule the LinkedIn posts we just wrote for Tuesday to Thursday at
3pm UK time, and the X posts once a day at 1pm. Save the Bluesky ones
as drafts so I can add images.
```

Claude checks your connected channels, finds free slots and schedules each post, asking before it changes anything. Every post lands on your Postbase calendar, where you can edit or cancel it before it goes out. Custom connectors work on Claude's Pro, Max, Team and Enterprise plans, and Free plans can add one. The step-by-step guide is [post to social media from Claude](/blog/post-to-social-media-from-claude).

::demo client-setup client=claude caption="Adding Postbase as a connector in Claude. It appears under Connected apps in Postbase, where you can revoke it in one click."

## What to keep doing yourself

- **The point of view.** Claude can sharpen an opinion; it shouldn't invent one for your brand.
- **Facts and claims.** Check prices, numbers and anything about competitors before it ships.
- **Final approval.** Read every post and email before it goes out, even when Claude schedules it.
- **Replies.** Conversations with customers are where trust is built. Write those yourself.

For the bigger picture on what to hand to AI and what not to, see [AI for social media: what works](/blog/ai-for-social-media).

## Frequently asked questions

### How can marketers use Claude?

To repurpose content into posts for each channel, plan campaigns, research competitors with web search, write and test copy variants, analyse performance data from spreadsheets, and, with a connector, schedule social posts directly from the chat.

### Is Claude good for marketing copy?

Yes, especially when it knows your brand. Put your style guide, positioning and examples of your best work in a Claude Project so every draft starts in your voice, then edit the result.

### Can Claude post to social media?

Yes, with a connector. Add an MCP server such as Postbase as a custom connector, and Claude can schedule posts to X, LinkedIn, Bluesky, Mastodon and YouTube, asking before it makes changes.

### What is a Claude Project?

A workspace in Claude with its own instructions and files that Claude reads in every chat inside it. For marketing, it's where your brand voice, audience and examples live.

### Which Claude plan do I need for marketing?

You can start on any plan; paid plans give you more usage. Custom connectors for scheduling posts work on Pro, Max, Team and Enterprise, and Free plans can add one. Check Anthropic's plan page for which features each plan includes.

### Can Claude analyse my marketing data?

Yes. Upload a CSV or spreadsheet of results and ask for patterns, comparisons and charts. Check a few of its numbers against the source before acting on them.
