# shapelessai-ai-sdk

[ShapelessAI](https://shapelessai.com) tools for the [Vercel AI SDK](https://ai-sdk.dev): your agent can see the social accounts you connected, schedule or publish a post, and check what went live.

```bash
npm install shapelessai-ai-sdk
```

Make an API key at [shapelessai.com/docs/api](https://shapelessai.com/docs/api) and set `SHAPELESSAI_API_KEY`.

```ts
import { generateText, isStepCount } from 'ai';
import { shapelessaiTools } from 'shapelessai-ai-sdk';

const { text } = await generateText({
  model: 'openai/gpt-5-mini',
  prompt: 'Schedule "We just shipped dark mode" to my LinkedIn in the next free slot.',
  tools: shapelessaiTools(),
  stopWhen: isStepCount(5),
});
```

| tool | does |
|---|---|
| `listAccounts` | connected accounts (X, LinkedIn, Instagram, TikTok, YouTube, Threads, Bluesky, Facebook and more) with their `connectionId` |
| `createPost` | a post on one account: next free queue slot by default, or `scheduledAt`, or `publishNow`. Asks for approval first (`needsApproval: true`); pass `{ needsApproval: false }` to turn that off |
| `listPosts` | recent posts with status, time, live URL and any error |

Each tool is also exported on its own (`listAccounts()`, `createPost()`, `listPosts()`), and every factory takes `{ apiKey, baseURL, needsApproval }`.

For everything else (video, images, Brand Memory, agents) use the ShapelessAI MCP server: [shapelessai.com/docs/mcp](https://shapelessai.com/docs/mcp).

MIT
