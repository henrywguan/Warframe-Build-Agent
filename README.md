# Warframe Build Agent

A Warframe guide agent that compares weapons, recommends builds, explains game mechanics, and grounds answers in the Warframe Wiki, Warframe Market, Overframe, and [Warframe Status](https://docs.warframestat.us/) documentation — plus a thin live world-state client for timers and events.

## What’s in this repo

| Piece | Role |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Repo contract for coding agents |
| [`.cursor/rules/warframe-advisor.mdc`](.cursor/rules/warframe-advisor.mdc) | Always-on player-advice behavior |
| [`.cursor/skills/`](.cursor/skills/) | Playbooks: compare gear, builds, mechanics, world-state |
| [`docs/sources.md`](docs/sources.md) | Source priority and conflict handling |
| [`docs/warframe-status.md`](docs/warframe-status.md) | Status field meanings + CLI map |
| [`src/`](src/) | TypeScript Warframe Status client + `wf` CLI |

## Defaults

- **Platform:** `pc` — Warframe is cross-play; this agent treats **PC and mobile** as the same default worldstate path.
- Live data comes from `https://api.warframestat.us` (community Warframe Status API). Timers can lag slightly vs the in-game UI.

## Setup

```bash
npm install
```

Requires Node 20+.

## Live world-state CLI

```bash
npm run wf -- summary
npm run wf -- fissures --steel-path
npm run wf -- fissures --tier Neo
npm run wf -- sortie
npm run wf -- archon-hunt
npm run wf -- cycles
npm run wf -- invasions
npm run wf -- void-trader
npm run wf -- get arbitration
```

Common flags: `--platform pc` (default), `--language en`, `--json`.

## Library usage

```ts
import { WarframeStatusClient } from "./src/index.ts";

const client = new WarframeStatusClient(); // platform: pc
const summary = await client.getSummary();
```

## Agent usage (Cursor)

Open this repo in Cursor and ask player-facing questions, for example:

- “Budget Steel Path build for Coda Hema”
- “Laetum vs Felarx for EDA”
- “What’s up for fissures / Cetus night right now?”

The advisor rule and skills steer comparisons, builds, mechanic explanations, and Status interpretation. For live data, prefer `npm run wf -- …`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run wf -- <cmd>` | World-state CLI |
| `npm test` | Unit tests (mocked fetch + formatters) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Emit `dist/` |

## Source notes

Market prices, patch rankings, and live timers change. When sources disagree, see [`docs/sources.md`](docs/sources.md).
