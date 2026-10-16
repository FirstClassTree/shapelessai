import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createPost, listAccounts, listPosts, shapelessaiTools } from "../dist/index.js";

// Each tool against a fake API: the request it sends and the shape it answers,
// which is what the model sees. No network, no key beyond the one we pass.
function fakeFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const key = `${init.method ?? "GET"} ${u.pathname}`;
    calls.push({ key, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined, query: Object.fromEntries(u.searchParams) });
    const route = routes[key];
    if (!route) return new Response(JSON.stringify({ error: `no route ${key}` }), { status: 404 });
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
  };
  return calls;
}

const opts = { apiKey: "slk_test" };

test("listAccounts keeps only live OAuth accounts and names the connectionId", async () => {
  const calls = fakeFetch({
    "GET /api/connections": {
      body: {
        connections: [
          { id: "c1", platform: "linkedin", handle: "tal", displayName: "Tal", mode: "oauth", status: "active" },
          { id: "c2", platform: "x", handle: "shapeless", mode: "oauth", status: "expired" },
          { id: "c3", platform: "tiktok", handle: "tracked", mode: "tracked", status: "active" },
        ],
      },
    },
  });
  const out = await listAccounts(opts).execute({}, { toolCallId: "t", messages: [] });
  assert.deepEqual(out, [{ connectionId: "c1", platform: "linkedin", handle: "tal", name: "Tal" }]);
  assert.equal(calls[0].headers.Authorization, "Bearer slk_test");
});

test("createPost queues by default, schedules with a time, publishes only on publishNow", async () => {
  const calls = fakeFetch({ "POST /api/posts": { body: { id: "p1", status: "scheduled", scheduledAt: "2026-10-16T09:00:00.000Z" } } });
  const run = (input) => createPost(opts).execute(input, { toolCallId: "t", messages: [] });
  await run({ connectionId: "c1", text: "Shipped." });
  assert.deepEqual(calls[0].body, { connectionId: "c1", postText: "Shipped.", queue: true });
  await run({ connectionId: "c1", text: "Shipped.", scheduledAt: "2026-10-16T09:00:00Z" });
  assert.deepEqual(calls[1].body, { connectionId: "c1", postText: "Shipped.", scheduledAt: "2026-10-16T09:00:00Z" });
  await run({ connectionId: "c1", text: "Shipped.", publishNow: true });
  assert.deepEqual(calls[2].body, { connectionId: "c1", postText: "Shipped." });
  const answer = await run({ connectionId: "c1", text: "Shipped." });
  assert.deepEqual(answer, { id: "p1", status: "scheduled", scheduledAt: "2026-10-16T09:00:00.000Z", url: null, error: null });
});

test("createPost asks for approval unless told not to", () => {
  assert.equal(createPost(opts).needsApproval, true);
  assert.equal(createPost({ ...opts, needsApproval: false }).needsApproval, false);
  assert.equal(shapelessaiTools(opts).createPost.needsApproval, true);
});

test("listPosts passes the filter and trims each post to what a model needs", async () => {
  const calls = fakeFetch({
    "GET /api/posts": {
      body: { posts: [{ id: "p1", connectionId: "c1", platform: "linkedin", status: "published", postText: "Hi", publishedAt: "2026-10-15T10:00:00Z", publishedLocation: "https://linkedin.com/feed/update/1", secret: "never" }] },
    },
  });
  const out = await listPosts(opts).execute({ status: "published", limit: 5 }, { toolCallId: "t", messages: [] });
  assert.deepEqual(calls[0].query, { limit: "5", status: "published" });
  assert.deepEqual(out, [{ id: "p1", connectionId: "c1", platform: "linkedin", status: "published", text: "Hi", scheduledAt: null, publishedAt: "2026-10-15T10:00:00Z", url: "https://linkedin.com/feed/update/1", error: null }]);
});

test("a refused key and a refused post each answer a sentence the model can act on", async () => {
  fakeFetch({ "GET /api/connections": { status: 401, body: {} } });
  await assert.rejects(listAccounts(opts).execute({}, { toolCallId: "t", messages: [] }), /refused the API key/);
  fakeFetch({ "POST /api/posts": { status: 422, body: { error: "LinkedIn posts are at most 3000 characters." } } });
  await assert.rejects(createPost(opts).execute({ connectionId: "c1", text: "x" }, { toolCallId: "t", messages: [] }), /3000 characters/);
  await assert.rejects(listAccounts({}).execute({}, { toolCallId: "t", messages: [] }), /SHAPELESSAI_API_KEY/);
});
