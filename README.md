# Shapeless

[Shapeless](https://shapelessai.com) runs your social presence: it drafts, schedules, and
publishes content across your connected platforms, holds your Brand Memory, and keeps standing
agents working while you sleep.

This repo is the public home of the **agent surface**: the `shapeless` CLI, the MCP server, the
[API contract for agents](docs/api-for-agents.md), the Claude Code plugin, and the issue tracker.
Your agent or script drives a Shapeless account: create jobs and resume stuck ones, approve and
publish posts, edit Brand Memory, manage the standing agents.

## Install

```bash
npx shapelessai --help      # one-off
npm i -g shapelessai        # keeps `shapeless` on your PATH
```

Node 20 or newer.

## Authenticate

Mint a key in the studio: **Settings -> API keys** (`/studio/settings`). Give it
only the scopes the caller needs - `read`, `write`, or `publish`. Only `publish`
can put content out.

```bash
shapeless login             # paste the key; we verify it and store it 0600
export SHAPELESS_API_KEY=slk_...   # or: env var, beats the stored key
```

Config lives in `~/.config/shapeless/config.json`. `SHAPELESS_BASE_URL`
overrides the API host (default `https://shapelessai.com`). `shapeless logout`
forgets the local copy; revoke the key itself in the studio.

Every command takes `--json` to print the raw API response, and `--help`.

## Jobs: durable runs

A job is a run the server keeps going whether or not you stay connected - the
right shape for agents and cron.

```bash
# Fire and forget
shapeless jobs create draft three posts about our beta launch

# Watch it live (tails the event stream, falls back to polling)
shapeless jobs create plan this week --label "Weekly plan" --budget 2.50 --watch

# Come back later
shapeless jobs list               # 200 newest; prints a cursor if older jobs exist
shapeless jobs list --before <cursor>   # the next page back
shapeless jobs show <id>          # transcript summary + outputs
shapeless jobs tail <id>          # re-attach to the live stream

# Put files on the message - the agent sees the image, not just its name
shapeless jobs create does this thumbnail work? --attach ./thumb.png --attach ./notes.md
shapeless jobs continue <id> and this one --media-key workspace-assets/<account>/logo.png

# Resume a stuck or failed run - history is rebuilt server-side
shapeless jobs continue <id> keep going, but make the second post shorter --watch

shapeless jobs stop <id>
```

## Posts: the queue

```bash
shapeless posts list --status proposed
shapeless posts show <id>
shapeless posts approve <id> <id> <id>    # proposed -> scheduled  [publish]
shapeless posts dismiss <id>
shapeless posts publish <id>              # out, now  [publish]
shapeless posts mark-posted <id> --url https://...
```

## Agents, Brand Memory, assets

```bash
shapeless agents list
shapeless agents create --name "Daily reach" --prompt "..." --days mon,thu --hours 9
shapeless agents edit <id> --status paused        # or: shapeless agents pause <id>
shapeless agents wake <id>                        # run it now  [publish]

shapeless brain ls
shapeless brain get positioning.md
shapeless brain put voice.md --file ./voice.md    # or pipe on stdin
shapeless brain import ./pitch-deck.pdf
shapeless brain export --out brain.zip

shapeless assets list
shapeless assets upload ./logo.png
shapeless connections
```

## MCP server

The hosted server is **`https://shapelessai.com/mcp`**. Add that URL to any host that speaks
remote MCP - Claude (Settings -> Connectors -> Add custom connector), ChatGPT (Developer mode),
Claude Code, Cursor, Codex, VS Code, Gemini CLI - and it opens a Shapeless tab to sign in and
allow. OAuth, no key. The steps for each host, in the vendor's words, are at
[shapelessai.com/connect](https://shapelessai.com/connect).

```bash
claude mcp add --transport http --scope user shapeless https://shapelessai.com/mcp   # then /mcp -> Authenticate
codex mcp add shapeless --url https://shapelessai.com/mcp && codex mcp login shapeless
gemini mcp add --transport http shapeless https://shapelessai.com/mcp
```

The same tools (`jobs_create`, `posts_approve`, `brain_write`, ...) also run locally:
`shapeless mcp` speaks MCP on stdio with the API key from `shapeless login`, and adds the tools
that read your disk (`assets_upload`, `brain_import`, and `files` on a job message). Every tool
carries a title and annotations - read-only tools run freely, anything that publishes, spends or
overwrites is flagged destructive so a host asks you first - and each description names the scope
it needs.

A job is a conversation, so work passes both ways between your terminal and the
web app:

- Every job result carries a **`url`** - `https://shapelessai.com/studio/c/<id>` -
  so an agent can hand the human back a link to what it just did.
- **`jobs_brief <id>`** is the cheap read before replying: the last 30 messages
  clipped, reasoning and tool-activity dropped, an artifact inventory and post
  counts per queue status. Deterministic, no model in the loop. `jobs_get` still
  gives the full transcript.
- **`jobs_list`** answers 200 jobs at a time, newest first, with a `nextCursor`;
  pass it back as `before` to walk further into the history.
- **`jobs_tail <id>`** watches a job's run (60 seconds max, 200 events) and
  returns the events plus a cursor to resume from; a job with no run stream to
  attach to answers `{live: false}` instead of erroring.
- **`jobs_create` and `jobs_continue` take files**: `files` (absolute local
  paths - `.md`/`.txt` ride inline, images, video, audio and PDF are uploaded
  here) and `mediaKeys` (anything already in the account, e.g. what
  `assets_upload` returned). Up to 6 per message. They land on the message the
  human sees in the studio, and the agent reads them for real - an image's
  pixels are inlined for that turn, not just its filename.

There is one prompt, **`continue`** (argument: `id`), which Claude Code surfaces
as a slash command: it loads that conversation's brief and tells the agent to
reply into the same thread with `jobs_continue`.

Running the stdio server instead of the hosted one - Claude Code:

```bash
claude mcp add shapeless -e SHAPELESS_API_KEY=slk_... -- npx shapelessai mcp
```

Claude Desktop (`claude_desktop_config.json`), and other stdio-only hosts:

```json
{
  "mcpServers": {
    "shapeless": {
      "command": "npx",
      "args": ["shapelessai", "mcp"],
      "env": { "SHAPELESS_API_KEY": "slk_..." }
    }
  }
}
```

Without the env var the server uses the key stored by `shapeless login`.

## Claude Code plugin

This repo is also a plugin marketplace. The `shapeless` plugin wires up the hosted MCP server and
ships a skill that teaches Claude the ropes - scopes, the post queue, when to touch Brand Memory:

```
/plugin marketplace add FirstClassTree/shapelessai
/plugin install shapeless@shapeless
```

Then run `/mcp`, pick shapeless and choose Authenticate - a browser tab signs you in once.

## The API

Everything above rides one documented contract: [docs/api-for-agents.md](docs/api-for-agents.md) -
routes, scopes, rate limits, and what deliberately refuses an API key.

## Issues

Found a bug or hit a wall? [Open an issue](../../issues). The CLI is developed against the
contract above; this repo is where it ships.
