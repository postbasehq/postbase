---
title: "No duplicate posts when a publish is retried"
date: 2026-10-05
type: fixed
area: Publishing
summary: A retry never posts the same thing twice, and a half-sent thread picks up where it stopped.
---

If a network fails partway through a thread, the retry continues from the next post instead of starting again.
