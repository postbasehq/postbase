---
title: "LinkedIn Post Inspector: fix broken link previews"
seo_title: "LinkedIn Post Inspector: how to fix link previews (2026)"
description: How to use LinkedIn Post Inspector to refresh a stale or broken link preview, the four Open Graph tags LinkedIn needs, the 1200 × 627 image rule, and fixes for the usual problems.
date: 2026-11-10
category: Developers
related: /integrations/linkedin, /blog/linkedin-link-in-first-comment, /tools/social-media-post-preview, /tools/social-media-image-sizes
---

**LinkedIn Post Inspector (linkedin.com/post-inspector) shows exactly what LinkedIn sees when someone shares your URL, and inspecting a URL makes LinkedIn fetch the page again, which refreshes an out-of-date preview.** If the preview is wrong or missing, the cause is almost always your page's Open Graph tags: LinkedIn needs `og:title`, `og:description`, `og:image` and `og:url`, and the image should be at least 1200 × 627 pixels.

This guide covers how to use the inspector, the tags LinkedIn reads, and fixes for the problems people hit most. Checked against LinkedIn's help pages on 10 November 2026.

## How to use LinkedIn Post Inspector

1. Go to **[linkedin.com/post-inspector](https://www.linkedin.com/post-inspector/)** and sign in.
2. Paste the full URL of your page, including `https://`, and click **Inspect**.
3. Read the results:
   - **Preview**: the card as it will appear in a post.
   - **Properties**: the title, description, image, type and author LinkedIn found, and the tag it took each from.
   - **Redirect trail**: every redirect LinkedIn followed to reach the page.
   - **Ingested content** and the time it was last fetched.

Inspecting a URL also updates LinkedIn's cached copy of it. So if you've just fixed your tags, inspect the URL once and new posts will use the new preview.

Posts already published keep the preview they were created with. To change one, delete the post and share the link again.

## The Open Graph tags LinkedIn needs

LinkedIn's help page on [making your website shareable](https://www.linkedin.com/help/linkedin/answer/a521928) lists four tags that must exist:

| Tag | What it's for |
| --- | --- |
| `og:title` | The headline on the preview card |
| `og:description` | The line of text under the title |
| `og:image` | The image on the card |
| `og:url` | The canonical address of the page |

In your page's `<head>`:

```html
<meta property="og:title" content="How we cut our build time in half" />
<meta property="og:description" content="Three changes that took our CI from 12 minutes to 6." />
<meta property="og:image" content="https://example.com/images/build-time-card.png" />
<meta property="og:url" content="https://example.com/blog/build-time" />
<meta property="og:type" content="article" />
```

`og:type` isn't on LinkedIn's required list, but it's worth including, and other networks use it too.

**Using Next.js?** The App Router's metadata API writes these tags for you:

```ts
export const metadata = {
  title: "How we cut our build time in half",
  description: "Three changes that took our CI from 12 minutes to 6.",
  openGraph: {
    title: "How we cut our build time in half",
    description: "Three changes that took our CI from 12 minutes to 6.",
    url: "https://example.com/blog/build-time",
    type: "article",
    images: [{ url: "https://example.com/images/build-time-card.png", width: 1200, height: 627 }],
  },
};
```

## LinkedIn link preview image size

| | LinkedIn's spec |
| --- | --- |
| Minimum size | 1200 × 627 pixels |
| Ratio | 1.91:1 |
| Maximum file size | 5 MB |
| Formats | JPG or PNG are safest |

A 1200 × 630 image, the common size for Facebook and X cards, works on LinkedIn too; the difference is a few pixels of crop. Keep text away from the edges, because LinkedIn crops slightly differently on desktop and mobile. Images much smaller than the minimum may show as a small thumbnail next to the title instead of a full-width card.

Our [image and video sizes tool](/tools/social-media-image-sizes) has every network's sizes in one place.

## Why your LinkedIn link preview is wrong or missing

**It shows an old title or image.** LinkedIn cached the page before you changed it. Inspect the URL in Post Inspector to refresh it. If it still shows the old version, add a harmless query string when sharing (for example `?v=2`), which LinkedIn treats as a new URL.

**There's no image.** Check that `og:image` is an **absolute URL** (starting with `https://`), that the image is public, and that it meets the size rule. Images behind a login, on a staging site, or in a directory blocked to crawlers can't be fetched. LinkedIn's help also mentions sites blocking LinkedIn from pulling the image.

**The wrong image appears.** There may be several `og:image` tags, or none, so LinkedIn picks something else from the page. Use exactly one `og:image` with the image you want first.

**No preview at all.** LinkedIn couldn't fetch the page. Common causes: the page needs a login, a firewall or bot protection blocks LinkedIn's crawler (its user agent contains `LinkedInBot`), `robots.txt` disallows it, or the page takes too long to respond. Post Inspector usually shows the error.

**The title or description is cut off.** Long values get truncated on the card. Keep `og:title` to about 70 characters and `og:description` to about 100 to 150.

**The redirect trail is long.** Several hops (http to https, apex to www, a tracking redirect) slow LinkedIn down and can lose tags along the way. Share the final URL.

**It works on LinkedIn but not elsewhere (or the other way round).** Networks cache separately. X, Facebook, Slack and others each have their own cache and rules.

## Preview a LinkedIn post before you publish

Post Inspector checks the link card. To see the whole post, including where LinkedIn cuts your text off with "...more", use our free [social media post preview tool](/tools/social-media-post-preview), which renders the post as it will look on LinkedIn and other networks.

## Links, reach and the first comment

Even with a perfect preview, many people find that posts with links in the body reach fewer people, and put the link in the first comment instead. The evidence is mixed in 2026; our guide to the [link in the first comment](/blog/linkedin-link-in-first-comment) sums it up.

If you schedule LinkedIn posts with Postbase, you can add a first comment that's posted for you right after the post goes out, so the link lands in the comment without you being online. See the [LinkedIn integration](/integrations/linkedin).

## Frequently asked questions

### What is LinkedIn Post Inspector?

A free LinkedIn tool at linkedin.com/post-inspector that shows how LinkedIn reads a URL: the preview card, the title, description and image it found, any redirects, and when it last fetched the page.

### How do I refresh a LinkedIn link preview?

Paste the URL into Post Inspector and click Inspect. LinkedIn fetches the page again and updates its cached preview for new posts. Posts already published keep their old preview.

### Why is my LinkedIn link preview not showing an image?

Usually the `og:image` tag is missing, uses a relative URL, points to an image that isn't public, or the image is too small. LinkedIn needs an absolute URL to a public image of at least 1200 × 627 pixels, under 5 MB.

### What size should a LinkedIn link preview image be?

At least 1200 × 627 pixels, a 1.91:1 ratio, under 5 MB. 1200 × 630 also works.

### How long does LinkedIn cache link previews?

LinkedIn doesn't publish an exact figure. Assume it keeps the old preview until you inspect the URL again in Post Inspector, which forces a fresh fetch.

### Do I need to be logged in to use Post Inspector?

Yes. You need a LinkedIn account to use it.

### Can I change the preview on a post I've already published?

No. Published posts keep the preview they had when you posted. Fix the tags, refresh the URL in Post Inspector, then delete and repost.
