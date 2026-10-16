import { tool } from "ai";
import { z } from "zod";

// ShapelessAI as Vercel AI SDK tools: three `tool()` definitions over the public
// API (https://shapelessai.com/docs/api), so an app on the AI SDK can read the
// connected accounts, put a post on one and read what went live. Published to
// npm as shapelessai-ai-sdk; the guide is https://shapelessai.com/docs/ai-sdk.
//
// Everything else the account can do (media, jobs, Brand Memory) is one fetch
// away on the same API, or every tool at once on the hosted MCP server. This
// package stays the three calls an agent in a product needs most.

export type ShapelessAIOptions = {
  /** An slk_ API key from https://shapelessai.com/studio/api-keys. Defaults to process.env.SHAPELESSAI_API_KEY. */
  apiKey?: string;
  baseURL?: string;
  /** Ask the user before a post is created. On by default: a post is visible to the account's audience. */
  needsApproval?: boolean;
};

type Json = Record<string, unknown>;

interface Connection {
  id: string;
  platform: string;
  handle: string;
  displayName?: string;
  mode: string;
  status: string;
}

interface Post {
  id: string;
  connectionId: string;
  platform: string;
  status: string;
  postText: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  publishedLocation?: string | null;
  error?: string | null;
}

function client(opts: ShapelessAIOptions = {}) {
  const base = (opts.baseURL ?? "https://shapelessai.com").replace(/\/$/, "");
  return async function call<T extends object>(path: string, init: RequestInit = {}): Promise<T> {
    const key = opts.apiKey ?? process.env.SHAPELESSAI_API_KEY;
    if (!key) throw new Error("Set SHAPELESSAI_API_KEY (make one at https://shapelessai.com/studio/api-keys).");
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
    });
    if (res.status === 401) throw new Error("ShapelessAI refused the API key. Make a new one at https://shapelessai.com/studio/api-keys.");
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(body.error || `ShapelessAI answered ${res.status}`);
    return body;
  };
}

const slim = (p: Post) => ({
  id: p.id,
  connectionId: p.connectionId,
  platform: p.platform,
  status: p.status,
  text: p.postText,
  scheduledAt: p.scheduledAt ?? null,
  publishedAt: p.publishedAt ?? null,
  url: p.publishedLocation ?? null,
  error: p.error ?? null,
});

/** The social accounts the key's owner connected, the ones a post can go to. */
export function listAccounts(opts: ShapelessAIOptions = {}) {
  const call = client(opts);
  return tool({
    description:
      "List the social media accounts connected to ShapelessAI that can be posted to (X, LinkedIn, Instagram, TikTok, YouTube, Threads, Bluesky, Facebook and more). Call this first to get a connectionId.",
    inputSchema: z.object({ platform: z.string().optional().describe('Only accounts on this platform, e.g. "linkedin".') }),
    execute: async ({ platform }) => {
      const { connections } = await call<{ connections: Connection[] }>("/api/connections");
      return connections
        .filter((c) => c.mode === "oauth" && c.status === "active" && (!platform || c.platform === platform.toLowerCase()))
        .map((c) => ({ connectionId: c.id, platform: c.platform, handle: c.handle, name: c.displayName ?? c.handle }));
    },
  });
}

/** Schedule a post to the account's next free queue slot, at a set time, or now. */
export function createPost(opts: ShapelessAIOptions = {}) {
  const call = client(opts);
  return tool({
    description:
      "Create a social media post on one connected account through ShapelessAI. With no time it goes to the account's next free queue slot; set scheduledAt for a time, or publishNow only when the user asked to post right now.",
    inputSchema: z.object({
      connectionId: z.string().describe("From listAccounts."),
      text: z.string().min(1).describe("The post text, exactly as it should appear."),
      scheduledAt: z.string().optional().describe("ISO 8601 time to publish at."),
      publishNow: z.boolean().optional().describe("True only when the user asked to post right now."),
    }),
    needsApproval: opts.needsApproval ?? true,
    execute: async ({ connectionId, text, scheduledAt, publishNow }) => {
      const body: Json = { connectionId, postText: text };
      // No time and no "now" means the next queue slot, so nothing posts at an odd hour by accident.
      if (scheduledAt) body.scheduledAt = scheduledAt;
      else if (!publishNow) body.queue = true;
      // The answer is { id, status, scheduledAt } when queued, { id, status, publishedLocation, error } when posted now.
      const res = await call<Post>("/api/posts", { method: "POST", body: JSON.stringify(body) });
      return { id: res.id, status: res.status, scheduledAt: res.scheduledAt ?? null, url: res.publishedLocation ?? null, error: res.error ?? null };
    },
  });
}

/** Recent posts and their status: scheduled, published (with its URL) or failed (with the reason). */
export function listPosts(opts: ShapelessAIOptions = {}) {
  const call = client(opts);
  return tool({
    description: "List recent ShapelessAI posts with their status, scheduled time, live URL once published, and the error if one failed.",
    inputSchema: z.object({
      status: z.enum(["proposed", "scheduled", "publishing", "published", "handoff", "failed", "canceled"]).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async ({ status, limit }) => {
      const q = new URLSearchParams({ limit: String(limit ?? 20), ...(status ? { status } : {}) });
      const { posts } = await call<{ posts: Post[] }>(`/api/posts?${q}`);
      return posts.map(slim);
    },
  });
}

/** All three tools, ready to spread into generateText({ tools }). */
export function shapelessaiTools(opts: ShapelessAIOptions = {}) {
  return { listAccounts: listAccounts(opts), createPost: createPost(opts), listPosts: listPosts(opts) };
}
