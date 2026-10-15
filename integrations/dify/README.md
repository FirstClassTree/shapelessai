# ShapelessAI for Dify

Schedule and publish social media posts from Dify workflows, chatflows and agents with [ShapelessAI](https://shapelessai.com), on the accounts you connected: LinkedIn (profiles and Pages), X, Instagram, TikTok, YouTube, Facebook, Threads and Bluesky.

## Setup

1. Sign up at [shapelessai.com](https://shapelessai.com) (the Free plan includes 10 posts a day) and connect your social accounts in the Studio.
2. Create an API key under [Settings, API keys](https://shapelessai.com/studio/api-keys). It starts with `slk_`.
3. In Dify, install the ShapelessAI plugin, open Tools, ShapelessAI, Authorize, and paste the key. The key is checked with a read-only call to `GET /api/me`.

## Tools

| Tool | What it does |
|---|---|
| List accounts | The accounts you can post to, with the `account_id` the other tools take. |
| Create post | Schedules a text post on one account: the account's next free queue slot (default), a set time (`when: at`, `scheduled_at` in ISO 8601 with a timezone), or right away (`when: now`, cannot be undone). |
| List posts | Your recent posts, newest first, with status, scheduled time and the live URL once published. Filter by status. |

A scheduled post can still be edited or cancelled in the ShapelessAI Studio or with `PATCH`/`DELETE /api/posts/{id}`.

## Requirements

- A ShapelessAI account and API key. Posting counts toward your plan's allowance; past it the API answers 402 with the pricing link, and the plugin shows that message.
- Network access to `https://shapelessai.com` only.

## Links

- API reference: https://shapelessai.com/docs/api
- MCP server, for agents that speak MCP: https://shapelessai.com/docs/mcp
- Source: https://github.com/FirstClassTree/shapelessai/tree/main/integrations/dify
- Support: hello@shapelessai.com
