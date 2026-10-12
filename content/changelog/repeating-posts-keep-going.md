---
title: Repeating posts keep going after a failed occurrence
date: 2026-10-06
type: fixed
area: Publishing
summary: One failed post no longer stops a repeating series, and editing a repeat keeps its original timezone.
draft: true
---

If one occurrence of a repeating post failed, for example because a channel was disconnected, the series used to stop. The next occurrence is now scheduled either way.

Editing a repeating post also keeps the timezone it was scheduled in, so a teammate in another timezone fixing a typo no longer shifts every later occurrence. And a time that doesn't exist on the day the clocks go forward now moves to the next valid time instead of going out an hour early.
