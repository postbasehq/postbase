---
title: Posts that might have gone out aren't retried automatically
date: 2026-10-06
type: improved
area: Publishing
summary: If X or LinkedIn errors after a post may already be live, Postbase asks you to check instead of posting it twice.
---

When X or LinkedIn returns a server error, or the connection drops before the reply arrives, the post may already be live. Postbase used to retry these automatically, which could post the same thing twice. Now it marks the post as failed with a note to check your account first, and you can press Retry if it didn't go out.

Clear refusals, and requests that never reached the network, are still retried as before.
