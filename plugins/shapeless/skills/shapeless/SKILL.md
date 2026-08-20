---
name: shapeless
description: Drive the user's Shapeless account - draft and publish social posts, run durable content jobs, manage standing agents and Brand Memory. Use when the user asks to create, review, schedule, or publish social content, or to check on their Shapeless jobs, posts, agents, or brand.
---

# Driving Shapeless

Shapeless runs the user's social presence. You reach it through the `shapeless` MCP tools this
plugin ships (or the `shapeless` CLI, same surface). Everything is one account, gated by an API
key with scopes: `read`, `write`, `publish`. Only `publish` puts content into the world.

## First contact

Call `me` to confirm the key works and see the plan and credit balance. If it fails, the user
needs a key: minted at https://shapelessai.com/studio/settings (Settings -> API keys), then either
`shapeless login` or `export SHAPELESS_API_KEY=slk_...`.

## The shape of the work

- **Jobs** are durable server-side runs: `jobs_create` with a goal ("draft three posts about the
  beta launch") returns an id and keeps going whether or not you stay attached. `jobs_get` shows
  the transcript and outputs; `jobs_continue` resumes a stuck or finished run with new
  instructions. Prefer a job for anything generative - the server holds the account's Brand
  Memory, connected platforms, and media pipeline.
- **Posts** are the queue: proposed -> scheduled -> published. `posts_list` / `posts_get` to
  review, `posts_approve` to accept a proposal into the schedule, `posts_dismiss` to reject,
  `posts_publish` to put one out now.
- **Agents** are standing schedules (`agents_list`, `agents_save`, `agents_wake`) - recurring
  content work the server runs on its own.
- **Brand Memory** (`brain_tree`, `brain_read`, `brain_write`, `brain_import`) is the account's
  durable knowledge: voice, positioning, product facts. Edit it when the user corrects how their
  brand should sound - that fixes every future post, not just one.

## Ground rules

- Tools whose descriptions say they publish or put content out are **live**: approving, publishing,
  waking an agent. Confirm with the user before calling them unless they explicitly asked for that
  exact action.
- Review before approving: read the post's actual text and media via `posts_get`, don't approve
  blind.
- Generative quality issues (wrong tone, wrong facts) are Brand Memory issues - offer to fix the
  source, not just the symptom.
- The API is rate-limited at 600 requests/hour per key; poll jobs with restraint.

The full contract (routes, scopes, refusal codes) lives in the repo's `docs/api-for-agents.md`.
