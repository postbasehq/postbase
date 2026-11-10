---
title: "TikTok API: which one you need (Content Posting, Display, Research)"
seo_title: "TikTok API: which one you need"
description: TikTok has several APIs. What the Content Posting, Display, Research and Commercial Content APIs do, who can use them, and how to get access.
date: 2026-11-10
category: Developers
related: /blog/tiktok-content-posting-api, /integrations/tiktok, /blog/how-to-schedule-tiktok-videos, /blog/how-long-can-tiktok-videos-be
---

**TikTok has several APIs, and most developers need one of two: the Content Posting API to publish videos and photos, or the Display API to show a creator's profile and videos.** Login Kit handles sign-in. The Research API is only for approved academic and non-profit researchers, and the Commercial Content API covers ads shown in the EU.

Here's what each one does, who can use it, and how to get access. Written against TikTok's developer docs on 10 November 2026.

## TikTok's APIs at a glance

| API | What it does | Who can use it |
| --- | --- | --- |
| Login Kit | "Log in with TikTok" and the access tokens the other APIs need | Any registered app |
| Content Posting API | Publish videos and photo posts to a user's TikTok, or send them to drafts | Any app that passes review; public posting needs an audit |
| Display API | Read a user's profile, stats and public videos | Any app that passes review |
| Share Kit | Hand content from your mobile app to the TikTok app to finish and post | Mobile apps |
| Embed Videos | Show TikTok videos and profiles on a web page | Anyone |
| Research API | Query public TikTok data at scale | Approved researchers only |
| Commercial Content API | Search ads and advertisers shown in the EU | Anyone approved for access |
| Data Portability API | Let a user export their TikTok data to your app | Users in the EEA and UK |

Ads and TikTok Shop have their own developer platforms, separate from these.

## Content Posting API: publishing to TikTok

The Content Posting API is the only official way to post to TikTok from your own software. It has two modes:

| Mode | Scope | What happens |
| --- | --- | --- |
| Direct Post | `video.publish` | Your app publishes the video or photos straight to the user's profile |
| Upload | `video.upload` | Your app sends the video to the user's TikTok inbox as a draft; they finish and post it in the app |

The catch is the **audit**. Until TikTok approves your app, everything it posts is private, visible only to the account owner. To pass, your posting screen has to follow TikTok's UX rules: show which account is posting, make the creator choose who can see the post (with no default), and post only after they explicitly confirm. Our [TikTok Content Posting API guide](/blog/tiktok-content-posting-api) walks through the endpoints, uploads and audit in detail.

Videos posted through the API can be up to 10 minutes long, and TikTok sets a shorter limit for some accounts. Here's [how long TikTok videos can be](/blog/how-long-can-tiktok-videos-be) by upload method.

## Display API: profiles and videos

The Display API reads data a user has authorised:

| Scope | What you get |
| --- | --- |
| `user.info.basic` | Open ID, avatar and display name |
| `user.info.profile` | Bio, profile link and verification status |
| `user.info.stats` | Follower, following, like and video counts |
| `video.list` | The user's public videos, with title, description, cover image, duration, embed link, and view, like, comment and share counts |

Use it to show a creator's profile and recent videos in your product, or to build simple analytics for the creator's own account. It doesn't give watch time, audience or traffic-source data; creators see those in TikTok Studio.

If you only want to show a few videos on a web page, you don't need the Display API at all: TikTok's **Embed Videos** works without an app.

## Research API: for researchers only

The Research API gives approved researchers query access to public TikTok data: videos, comments, user profiles, follower and following lists. Eligibility is narrow:

- Academic institutions in the US, EEA, UK, Canada or Switzerland.
- Not-for-profit or independent research bodies in the EU, with a beta in some other countries.
- Researchers with vetted status under the EU's Digital Services Act.

Applicants need a research proposal, an ethics review and independence from commercial interests. Creators, advertisers and companies aren't eligible. Approved projects get 1,000 requests and up to 100,000 records a day. Details are on TikTok's [Research API page](https://developers.tiktok.com/products/research-api/).

## Commercial Content API: EU ad transparency

The Commercial Content API lets anyone with approved access search ads and other commercial content shown in the EU, by advertiser name or keyword: when each ad ran, its targeting, and how many people saw it. Ads stay searchable for a year after they last ran. TikTok says it replies to complete applications within two working days. It's for transparency and research, not for running ads.

## Which TikTok API do you need?

| You want to... | Use |
| --- | --- |
| Post or schedule videos from your app | Login Kit + Content Posting API |
| Let users post from your mobile app via the TikTok app | Share Kit |
| Show a creator's profile and videos in your product | Login Kit + Display API |
| Show a few videos on a web page | Embed Videos |
| Report on a creator's own video stats | Display API (`video.list`, `user.info.stats`) |
| Study TikTok content as an academic | Research API |
| Research ads shown in the EU | Commercial Content API |
| Run and manage ads | TikTok's separate API for Business |

## How to get access

1. **Create a developer account** at [developers.tiktok.com](https://developers.tiktok.com), ideally under an organisation so your team shares the app.
2. **Create an app** and add the products you need (Login Kit plus Content Posting or Display).
3. **Request the scopes** your app uses, and nothing more. Every scope is checked in review.
4. **Submit for review** with a demo video of your app using each scope. TikTok reviews the app before it works for anyone other than you.
5. **For public posting, pass the Content Posting audit.** This is a separate step, and the one most apps get stuck on.

The Research and Commercial Content APIs use their own application forms instead.

## If you just want to schedule TikToks

Building on the Content Posting API means an app review, an audit and a posting UI that meets TikTok's rules. If what you need is to schedule your own TikToks, a scheduler that has done that work is quicker. TikTok Studio on a computer schedules up to 10 days ahead; here's [how to schedule TikTok videos](/blog/how-to-schedule-tiktok-videos).

Postbase uses the Content Posting API to schedule TikToks alongside YouTube, X, LinkedIn, Bluesky and Mastodon, uploading large videos in parts. To be upfront: Postbase is still waiting for TikTok's audit, so for now TikToks it posts go out as private, and you switch them to public in the app. Postbase's own REST API and MCP server can't schedule TikTok posts; those are made in the composer.

::demo composer network=tiktok caption="Scheduling a TikTok in Postbase: add the video, write the caption, choose TikTok's settings and pick a time."

## Frequently asked questions

### Does TikTok have a public API?

Yes, several. The Content Posting API publishes videos and photos, the Display API reads profiles and videos, and Login Kit handles sign-in. Each needs a registered app that passes TikTok's review.

### Is the TikTok API free?

TikTok doesn't charge for its developer APIs. The cost is the review: your app has to pass TikTok's app review, and public posting needs a separate audit.

### Can I post to TikTok with the API?

Yes, with the Content Posting API. Until TikTok audits your app, posts are private. After the audit, they can be public.

### Can I get TikTok analytics through the API?

Basic ones. The Display API returns follower counts and each public video's views, likes, comments and shares. Watch time, audience and traffic sources are only in TikTok Studio.

### Who can use the TikTok Research API?

Approved academic researchers and not-for-profit research bodies in eligible regions, with a defined research project and an ethics review. Companies, creators and advertisers aren't eligible.

### Can I scrape TikTok instead of using the API?

TikTok's terms prohibit scraping. The Research API is the approved route to public data at scale, and only for eligible researchers.
