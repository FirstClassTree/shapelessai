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
shapeless jobs list
shapeless jobs show <id>          # transcript summary + outputs
shapeless jobs tail <id>          # re-attach to the live stream

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

`shapeless mcp` speaks MCP on stdio and exposes the same client as tools
(`jobs_create`, `posts_approve`, `brain_write`, ...). Each tool's description
names the scope its key needs; tools that publish content say so plainly, so a
host can gate them.

Claude Code:

```bash
claude mcp add shapeless -e SHAPELESS_API_KEY=slk_... -- npx shapelessai mcp
```

Claude Desktop (`claude_desktop_config.json`), and most other MCP hosts:

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

This repo is also a plugin marketplace. The `shapeless` plugin wires up the MCP server and ships
a skill that teaches Claude the ropes - scopes, the post queue, when to touch Brand Memory:

```
/plugin marketplace add FirstClassTree/shapelessai
/plugin install shapeless@shapeless
```

Then authenticate once with `shapeless login` (or export `SHAPELESS_API_KEY`).

## The API

Everything above rides one documented contract: [docs/api-for-agents.md](docs/api-for-agents.md) -
routes, scopes, rate limits, and what deliberately refuses an API key.

## Issues

Found a bug or hit a wall? [Open an issue](../../issues). The CLI is developed against the
contract above; this repo is where it ships.
