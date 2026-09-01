# API for agents

The studio in a browser rides a signed session cookie. An agent outside that browser - a script,
the CLI, Claude Code - rides an **API key**: the same account, the same routes, a second
credential. This file is the contract the CLI is built against. It mirrors the copy that lives
beside the app itself; the two are kept identical.

## Authenticating

1. Mint a key in **Settings -> API keys** (`/studio/settings`). Give it a name and its scopes.
   The plaintext is shown once and never again: only its sha256 is stored.
2. Send it on every request:

```bash
curl -H "Authorization: Bearer slk_..." https://shapelessai.com/api/posts
```

A key is `slk_` + 40 base64url characters. Revoking one in the same screen kills it on the next
request.

## Scopes

A key holds any subset of three scopes. A cookie session is the human at the keyboard, so it
implicitly holds all three.

| Scope | What it opens |
| --- | --- |
| `read` | Every GET: posts, agents, runs, analytics, Brand Memory, media, identity. |
| `write` | Drafting and editing: chat turns, files, assets, agents, queued posts, dismissals. |
| `publish` | Anything that puts content out or marks it out: approvals, publish, wakes, sends. |

The line that matters is `write` vs `publish`. A `write` key can draft all day and change nothing
the world sees. Only `publish` can approve a proposal, publish a queued post, mark one posted, wake
an agent, send an engagement action, or arm an agent's autopublishing.

Refusals: `401` unknown or revoked key, `403` key missing the scope, `429` over the rate limit,
`503` if the service has no database.

## Rate limit

**600 requests per hour per key**, counted per running instance. Cookie sessions are not limited by
this. Requests that fail the scope check still count.

## Paging

The thread lists - `GET /api/conversations` and `GET /api/v1/jobs` - answer **200 rows per page**,
newest first, alongside a `nextCursor`. Non-null means older rows exist: send it back verbatim as
`?before=<nextCursor>` for the next page, and keep going until it is `null`. The cursor is the last
row's sort key (`<updatedAtISO>~<id>`), so a thread touched while you page is never skipped or
served twice; anything else is a `400`. `?origin=` on the jobs list filters the page it answers,
so a page can carry fewer than 200 jobs and still have a cursor - follow the cursor, not the count.

## Routes that accept a key

`src/server/auth/route-scopes.test.ts` enforces this table; if the two disagree, the test fails.

### Identity and accounts

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/me` | `read` | Who am I, plan, credit balance. |
| GET | `/api/connections` | `read` | Connected social accounts (identity only, no tokens). |
| GET | `/api/ad-accounts` | `read` | Connected ad accounts (identity only, no tokens) + whether connecting one is configured. |
| DELETE | `/api/ad-accounts?id=` | `publish` | Unlink an ad account. Costs `publish`: it ends our ability to spend. |

### Chat

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| POST | `/api/studio` | `write` | One agent turn, NDJSON stream of StudioEvents. |
| GET | `/api/studio/tail` | `read` | Re-attach to a detached run's event log. |
| POST | `/api/studio/stop` | `write` | Stop a detached run. |
| PUT | `/api/studio/attachments/[filename]` | `write` | Upload a chat attachment, returns its mediaKey. |
| GET | `/api/conversations` | `read` | Thread list, one page (see [Paging](#paging)). |
| GET | `/api/conversations/[id]` | `read` | One transcript, with each post artifact's queue state. |
| PATCH/DELETE | `/api/conversations/[id]` | `write` | Rename or delete a thread. |

### Jobs

The durable alternative to stream plumbing. A job is a conversation whose ids the server mints:
you send a goal, get a `202` with the job's id, and the run keeps going whether or not you stay
connected. Poll the job for its transcript and outputs, or tail the live stream. Posting another
message to a job builds the conversation history server-side from the stored transcript, so
sending "continue" to a failed or stuck job resumes it.

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/jobs` | `write` | Start a job: `{goal, label?, budgetUsd?, timezone?, attachments?}` returns `202 {id, title, status}`. |
| GET | `/api/v1/jobs` | `read` | List jobs with liveness, one page (see [Paging](#paging)). `?origin=job\|chat\|agent` filters by who started the thread. |
| GET | `/api/v1/jobs/[id]` | `read` | One job: enriched transcript, `status`/`live`, and an outputs summary (posts with queue state, media). |
| POST | `/api/v1/jobs/[id]/messages` | `write` | Another turn on the job: `{text, budgetUsd?, timezone?, attachments?}` returns `202 {id, status}`. |

A running job streams into the same event log chat uses: follow it with
`GET /api/studio/tail?conversationId=<id>`, stop it with `POST /api/studio/stop`. The `label`
becomes the job's title; without one the goal's first line is. Refusals are the plan turn's:
`402` when the trial is exhausted, `429` when planning too fast, `400` for an attachment the
account cannot use.

#### Attaching files

`attachments` puts files on the message itself - the same thing the web composer's paperclip does,
and the agent **sees** them: an image's pixels are inlined for that turn, video and PDF go over by
storage URI, and the media key is named in the text so it survives in history after the pixels are
gone. Up to **6** per message; each entry needs a `name` and either `text` (inlined, 24k
characters) or a `mediaKey`:

```jsonc
{
  "goal": "Does this thumbnail work for the launch post?",
  "attachments": [
    { "name": "thumb.png", "mediaKey": "chat-uploads/<account>/thumb-mt1z.png", "contentType": "image/png" },
    { "name": "notes.md", "text": "Launch is Thursday. Tone: plain, no hype." }
  ]
}
```

Get a `mediaKey` by uploading the bytes to `PUT /api/studio/attachments/[filename]` (10MB images,
30MB video/PDF; filenames are `[A-Za-z0-9._-]`). **Any media key the account owns also works** - a
brand asset from `workspace-assets/`, media an earlier run produced - because the server copies it
into this account's `chat-uploads/` prefix before the turn, which is the only prefix the engine
reads. A key belonging to another account is a `400` naming the file, not a run that dies halfway.
A malformed entry is a `400` too: attachments are never dropped silently.

### Posts

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/posts` | `read` | The queue: proposed, scheduled, published. |
| POST | `/api/posts` | `publish` | Queue a post (a "now" time publishes inline). |
| GET | `/api/posts/[id]` | `read` | One row's live state. |
| PATCH/DELETE | `/api/posts/[id]` | `write` | Edit or cancel a still-scheduled post. |
| POST | `/api/posts/[id]/approve` | `publish` | Approve one proposal: proposed -> scheduled. |
| POST | `/api/posts/[id]/publish` | `publish` | Publish a queued post now. |
| POST | `/api/posts/[id]/mark-posted` | `publish` | "I posted it myself". |
| POST | `/api/posts/[id]/revise` | `write` | Rework a draft from feedback. |
| POST | `/api/posts/[id]/boost` | `publish` | Propose a paid boost of a published Meta post. |
| GET | `/api/posts/[id]/comments` | `read` | The thread under a published post, with each drafted reply. |
| POST | `/api/posts/[id]/comments` | `publish` | Stage your own reply to one comment. |
| POST | `/api/posts/[id]/comments/refresh` | `publish` | Read the thread from the platform now. |
| POST | `/api/posts/resolve` | `publish` (approve) / `write` (dismiss) | Resolve a batch of proposals. |
| GET | `/api/inbox` | `read` | Everything waiting on a human decision. |

`/api/posts/[id]/boost` takes `{budgetCents, days, objective}` (`engagement` or `traffic`) and
spends nothing: it creates a proposed `boost` action, and only `POST /api/actions/[id]/send`
on that action creates the Meta campaign. The budget is the campaign's lifetime cap, billed by
Meta to the connected ad account. It refuses (`402`) without an active paid plan (a trial does
not qualify), and (`409`) when the post is not a published Facebook Page or Instagram post with a
known platform id, or when no active Meta ad account is connected.

`GET /api/posts/[id]/comments` answers `{postId, platform, comments[], lastReadIso}` from our own
ledgers - it never calls a platform. Each comment carries `{id, authorHandle, text, url, atIso,
isOwn, replyVerdict, reply}`, where `reply` is the drafted action bound to it
(`{actionId, text, status, verdict, error, url, sentAtIso}`) or `null`. `POST` with
`{commentId, text}` stages that reply as a proposed `reply` action - the same row the approvals
inbox holds - which `POST /api/actions/[id]/send` then sends; it refuses (`409`) when the
platform has no sanctioned reply path for that comment (`replyVerdict: "task"`).
`/comments/refresh` runs the same engagement poll Cloud Tasks fires after publishing, and only
spends credits when there is a new comment to draft a reply to.

### Agents (strategies) and the manager

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/strategies` | `read` | The agent roster. |
| POST | `/api/strategies` | `write`, or `publish` with `autoPublishPosts` | Create an agent. |
| PATCH | `/api/strategies/[id]` | `write`, or `publish` with `autoPublishPosts` | Edit an agent. |
| POST | `/api/strategies/[id]/run` | `publish` | Wake an agent now. |
| POST | `/api/strategies/suggest` | `write` | One engine-studied agent seed for the editor. |
| POST | `/api/manager/run` | `publish` | "Plan now" through the first active agent. |
| GET | `/api/manager/runs`, `/api/manager/runs/[id]` | `read` | Wake runs and their proposals. |
| POST | `/api/manager/runs/[id]/approve` | `publish` | Approve a run's proposals. |
| POST | `/api/manager/runs/[id]/dismiss` | `write` | Dismiss a run with feedback. |
| GET/PUT | `/api/manager/settings` | `read` / `write` | Cadence and targeting. |
| GET | `/api/manager/budget` | `read` | Spend, allowance, paused state. |

### Engagement actions

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| POST | `/api/actions/[id]/send` | `publish` | Send a drafted comment or reply, or run an approved boost. |
| POST | `/api/actions/[id]/done` | `write` | Mark a task card done. |
| POST | `/api/actions/[id]/skip` | `write` | Skip a proposed action. |

### Brand Memory, assets and media

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/workspace` | `read` | The brain's file tree with its completion ring. |
| GET | `/api/workspace/file?path=` | `read` | One file. |
| PUT/DELETE | `/api/workspace/file` | `write` | Write or delete one file. |
| GET | `/api/workspace/export` | `read` | The whole brain as a zip. |
| POST | `/api/brain/interview` | `write` | One interview turn (NDJSON stream). |
| POST | `/api/brain/import` | `write` | Import a .md/.txt/.pdf/.docx document. |
| GET | `/api/brain/assets`, `/api/assets` | `read` | Brand uploads, and the full asset library. |
| GET | `/api/brain/assets/[filename]` | `read` | Stream one asset (Range supported). |
| PUT/PATCH/DELETE | `/api/brain/assets/[filename]` | `write` | Upload, rename, delete an asset. |
| GET | `/api/media/[...key]` | `read` | Stream any media key this account owns. |

### Analytics

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/metrics` | `read` | Published posts with their latest samples and the 90-day series. |
| GET | `/api/metrics/history?post=` | `read` | One post's accrual curve against the account median. |
| GET | `/api/metrics/followers` | `read` | Follower counts and the weekly delta. |
| POST | `/api/metrics/refresh` | `write` | Refresh stale samples (calls the platforms). |

## Cookie-only, on purpose

These refuse a bearer key. It is not an oversight:

- **Key management** (`/api/keys`, `/api/keys/[id]`) - a key must never be able to mint itself a
  wider key. A leaked read key stays a leak, not a foothold.
- **Money** (`/api/checkout`, `/api/portal`) - buying and cancelling belong to the person paying.
- **Sign-in** (`/api/auth/*`) and **platform connections** (every `/api/connections/*` OAuth start,
  callback, delete, and the tracked list) - these are browser redirect flows carrying platform
  grants. Only `GET /api/connections`, the identity list, takes a key.
- **Founder metrics** (`/api/metrics/agent-lanes*`) and `/metrics` - gated on `FOUNDER_EMAILS`.
- **Webhooks and platform callbacks** (`/api/polar/webhook`, `/api/meta/*`, `/api/subscribe`) -
  they carry their own signatures.
- **Internal cron** (`/api/internal/*`) - `x-internal-key`, unchanged.
- **Dev** (`/api/dev/*`) and the daily-brief routes (`/api/brain/brief/*`), which are browser
  surfaces today.

## The CLI

`npx shapelessai` ships the `shapeless` command, built on this contract: jobs (create, watch,
continue, tail, stop), posts (approve, dismiss, publish), agents, Brand Memory files and assets.
`shapeless login` stores a key from Settings -> API keys; `SHAPELESS_API_KEY` beats it for
scripts. Commands, flags and examples live in [README.md](../README.md).

## The MCP server

`shapeless mcp` serves the same client as MCP tools on stdio, so an agent host discovers these
routes as tools instead of reading this file. Tool descriptions name the scope each call needs,
and tools that put content out say so plainly - gate those on the host side. Setup snippets for
Claude Code and Claude Desktop are in [README.md](../README.md#mcp-server).

Two things the tool layer adds on top of the routes, because a local agent and the web app share
one account and should hand work back and forth:

- **Every job result carries `url`** - `<baseUrl>/studio/c/<id>`, the conversation the human opens.
  `jobs_create`, `jobs_list`, `jobs_get` and `agents_wake` (its `conversationId`) all decorate.
- **`jobs_list` pages like the route**: 200 jobs at a time plus `nextCursor`, which the tool takes
  back as `before`.
- **`jobs_brief`** answers a token-compact digest of `GET /api/v1/jobs/[id]`: header, the last 30
  messages with reasoning and tool-activity parts dropped and each body clipped, an artifact
  inventory, and post counts per queue status. Deterministic - no model in the loop. `jobs_get`
  still serves the full transcript.
- **`jobs_tail`** is `GET /api/studio/tail` in one bounded call: it replays from a cursor, follows
  live, and returns `{live, cursor, events}` when the run ends, 60 seconds pass or 200 events
  arrive. `live` is whether there was a stream to attach to - the route's `404` becomes
  `{live: false, hint}` rather than an error; a run that already finished replays and closes on
  its terminal event.

The server also serves one **prompt**, `continue` (argument: `id`), which a host like Claude Code
surfaces as a slash command: it hands the agent the same brief plus the instruction to reply into
that conversation with `jobs_continue`.
