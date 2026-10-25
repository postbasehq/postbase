---
title: How to write LinkedIn posts with Claude that don't sound like AI
seo_title: Claude prompts for LinkedIn posts that sound like you
description: A practical system for writing LinkedIn posts with Claude in your own voice: a voice profile, copy-paste prompts, the AI tells to ban, and how to schedule the results.
date: 2026-10-25
category: AI agents
related: /ai/claude/linkedin, /mcp/linkedin, /blog/post-to-social-media-from-claude, /blog/let-an-ai-agent-post-safely, /tools/linkedin-text-formatter
---

Everyone can spot an AI-written LinkedIn post by now. It opens with "In today's fast-paced world", has a one-word line for drama, says "game-changer" twice and ends with "Thoughts?". The problem isn't Claude. It's asking for a post about a topic and letting the model fill every gap with the average of the internet.

The fix is to give Claude what only you have, your stories, opinions and the way you write, and to keep the model's job small. This guide shows a system that works, with prompts you can copy. It works in Claude's chat app, in Claude Code, and in any AI tool connected to Postbase.

## Why AI LinkedIn posts sound like AI

- **No raw material.** "Write a post about leadership" gives Claude nothing specific, so it writes something general.
- **No voice to copy.** Without examples, it falls back on a generic "LinkedIn voice".
- **"Sound human" doesn't work.** Telling a model to sound human just produces a different flavour of the same average tone.
- **Too many jobs at once.** Picking the idea, finding the story, choosing the angle and writing it is four jobs. Give Claude one or two.

## Step 1: build a voice profile once

Paste five to ten of your best past posts (or emails, or anything you've written that sounds like you) into Claude and ask:

> Here are some things I've written. Describe my writing voice so another writer could copy it: sentence length, vocabulary, how I open and close, what I never do, how I use humour, formatting habits. Then list 10 phrases I'd never use. Keep it under 250 words.

Read the result, fix anything that's wrong, and save it. In Claude, put it in a **Project's instructions** so every chat in that project starts with it. That's your voice profile.

## Step 2: give Claude material, not topics

The best posts come from something real: a mistake, a number, a conversation, a decision. Instead of a topic, give Claude the raw notes:

> Raw notes: we lost our biggest customer in March. They said onboarding took too long. We cut the setup from 9 steps to 3 over six weeks. Churn in the first month dropped from 22% to 9%. The step we were most scared to cut was the team invite, and nobody missed it.
>
> Turn this into a LinkedIn post in my voice. Use only these facts; if you need a detail I haven't given you, ask me instead of making it up.

That last line matters. It stops Claude inventing anecdotes, numbers or quotes.

## Step 3: ban the AI tells

Add a list of phrases and habits to your project instructions. A starting list:

- Openers like "In today's world", "Let's dive in", "Here's the thing", "Unpopular opinion"
- Words like "delve", "leverage", "game-changer", "unlock", "elevate", "landscape", "journey"
- One-word lines for drama ("Wrong.")
- "It's not X, it's Y" constructions
- Lists of exactly three adjectives
- Emoji bullets and rocket emoji
- Ending with "Thoughts?" or "Agree?"
- Hashtags (or more than three, if you use them at all)

Then add one line: "If a draft uses any of these, rewrite it before showing me."

## Step 4: ask for options, not a finished post

Claude is better at variety than at guessing the one right answer. Ask for hooks first:

> Give me 5 different opening lines for this post, each under 15 words. Make them specific to the story, not clickbait.

Pick one, then ask for the full post. Then edit it yourself. A few minutes of your edits is what makes it yours: swap a word, cut a paragraph, add the detail Claude couldn't know.

## Prompts you can copy

**From a meeting or call:**

> Here's a summary of a customer call. Find the one insight other founders would find useful, and write a LinkedIn post about it in my voice. Don't name the customer. Under 1,200 characters.

**From a blog post:**

> Here's a blog post I wrote. Write a LinkedIn post that gives away the single most useful idea in it, so the post is worth reading on its own. The link will go in the first comment, so don't mention a link in the post.

**From an opinion:**

> I believe most onboarding checklists are too long. Here are my reasons: [notes]. Write a LinkedIn post making the case, in my voice. Include one honest counterargument.

**To edit, not write:**

> Here's my draft. Don't rewrite it. Point out the three weakest lines and suggest a tighter version of each.

## Formatting that works on LinkedIn

- **Front-load the point.** Only the first two or three lines show before "see more". Check where the fold falls with our [LinkedIn text formatter](/tools/linkedin-text-formatter).
- **Short paragraphs.** One or two sentences each, with blank lines between.
- **Stay well under 3,000 characters.** Most good posts are 600 to 1,500.
- **Links in the first comment** if reach matters more than clicks. Here's [what the data says](/blog/linkedin-link-in-first-comment).

## From Claude to scheduled

Once you have a post you like, you don't need to copy and paste it into LinkedIn. Connect Claude to Postbase and it can schedule the post for you:

1. **Connect LinkedIn in Postbase** on the Channels page.
2. **Add Postbase to Claude** as a connector. Here's [the step-by-step guide](/ai/claude/linkedin).
3. **Ask Claude to schedule it:**

> Schedule this for Tuesday at 8:30am on LinkedIn, with the case study link as the first comment. Also write a shorter version for X and schedule it for noon.

The post lands on your Postbase calendar, where you can read and edit it before it goes out. If you'd rather approve every post first, ask Claude to "save it as a draft" instead, and schedule it yourself from Postbase. Our guide to [letting an AI agent post safely](/blog/let-an-ai-agent-post-safely) covers the guardrails.

If you'd rather not set up a connector, the **Postbase agent** inside the app does the same thing: write or paste your notes, and it drafts a version for each network and waits for you to click Schedule.

::demo agent prompt="Turn these notes about cutting onboarding from 9 steps to 3 into a LinkedIn post in my voice, link in the first comment, Tuesday 8:30am." channels=linkedin caption="The Postbase agent drafting a LinkedIn post from notes. You check it and click Schedule."

## A weekly routine

1. **During the week**, drop raw notes into an "Ideas" doc whenever something happens: a call, a mistake, a number.
2. **Once a week**, open your Claude project and turn three of them into posts using the prompts above.
3. **Edit each one** for five minutes.
4. **Ask Claude to schedule them** across the week, or paste them into the Postbase composer.
5. **Spend ten minutes a day** replying to comments yourself. That part should never be automated.

## Frequently asked questions

### Can Claude write LinkedIn posts?

Yes, and well, if you give it real material and examples of your writing. Posts written from a bare topic tend to sound generic.

### How do I make AI LinkedIn posts sound like me?

Give Claude five to ten of your own posts, ask it to describe your voice, and save that description in a Claude Project's instructions. Then give it raw notes rather than topics, ban the phrases you never use, and always edit the result yourself.

### Does LinkedIn penalise AI-generated posts?

LinkedIn hasn't said it ranks AI-written posts lower. But generic posts get fewer reactions and comments, and that does lower reach. Posts built from your own stories and edited by you avoid the problem.

### Can Claude post to LinkedIn directly?

Yes. Connect Claude to Postbase with its MCP connector and ask it to schedule a post. It appears on your Postbase calendar, so you can check it before it goes out.

### Is Claude or ChatGPT better for LinkedIn posts?

Both work well with the same approach: real material, voice examples and a list of banned phrases. Use whichever you already use. Postbase connects to Claude, ChatGPT, Cursor and other AI tools.

### Should I tell people a post was written with AI?

That's up to you. Many people use AI as an editor or first-drafter and edit heavily, the same way they'd work with a human editor. What matters is that the stories and opinions are genuinely yours.
