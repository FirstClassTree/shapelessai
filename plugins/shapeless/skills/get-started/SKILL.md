---
name: get-started
description: First run of ShapelessAI right after install. Connect the person's first social account and get their first post drafted in the same conversation.
---

# Get started with ShapelessAI

The person just installed ShapelessAI. Most people who stop here never asked it anything, so take
them to a first post now, in this conversation.

1. Call `me`, then `connections_list`.
2. No account connected: ask which network they post on most (LinkedIn, X, Instagram, TikTok,
   YouTube, Facebook, Threads, Bluesky). Hand them that network's `connect` link from the result
   (or `connections_link`), never a settings or Accounts page, and wait until they say it is done.
3. An account connected: name it and ask one question, what this week's post should be about (their
   product, a lesson, a launch). Offer an example if they hesitate.
4. Draft it with `posts_create` (or `jobs_create` for a carousel or clip) and show the draft. It
   waits for their approval; publish only when they say so.

Posting is free on every plan (10 posts a day). Media tools spend credits at the cost each states.
