# Warframe Build Agent

A Warframe guide agent that compares weapons, recommends builds, explains game mechanics, and grounds answers in the Warframe Wiki, Warframe Market, Overframe, and [Warframe Status](https://docs.warframestat.us/) documentation — plus thin clients for live world-state and market prices.

## What’s in this repo

| Piece | Role |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Repo contract for coding agents |
| [`.cursor/rules/warframe-advisor.mdc`](.cursor/rules/warframe-advisor.mdc) | Always-on player-advice behavior |
| [`.cursor/skills/`](.cursor/skills/) | Playbooks: compare gear, builds, mechanics, world-state |
| [`docs/sources.md`](docs/sources.md) | Source priority and conflict handling |
| [`docs/warframe-status.md`](docs/warframe-status.md) | Status field meanings + CLI map |
| [`docs/warframe-market.md`](docs/warframe-market.md) | Market v2 pricing + daily 4pm Pacific pull |
| [`docs/warframe-patch-notes.md`](docs/warframe-patch-notes.md) | Official updates/hotfixes + daily 4pm Pacific check |
| [`config/market-watchlist.json`](config/market-watchlist.json) | Items tracked for daily price snapshots |
| [`src/`](src/) | Status, Market, and Patch Notes clients + CLIs |
| [`web/`](web/) | Mobile-friendly chat UI for on-the-go use |
| [`hermes/`](hermes/) | Hermes Desktop/CLI importable profile distribution |
| [`docs/web-chat.md`](docs/web-chat.md) | Run/deploy the chat UI |
| [`docs/hermes-export.md`](docs/hermes-export.md) | Import this agent into Hermes Desktop |
| [`docs/commands.md`](docs/commands.md) | `/list` command catalog (web + agent chat) |
| [`overlay/`](overlay/) | Desktop arsenal overlay (regions + action UI) |
| [`docs/overlay.md`](docs/overlay.md) | Run the interactive overlay |
| [`.cursor/agents/`](.cursor/agents/) | Cursor subagents (cleanup-simplify) |
| [`docs/cleanup-agent.md`](docs/cleanup-agent.md) | Cleanup subagent + git-change wiring |

## Defaults

- **Platform:** `pc` — Warframe is cross-play; this agent treats **PC and mobile** as the same default worldstate path.
- World-state: `https://api.warframestat.us`
- Market prices: `https://api.warframe.market/v2/`
- Daily market + patch-notes checks target **4:00 PM America/Los_Angeles** (PST/PDT)

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

## Warframe.market CLI

```bash
npm run market -- status
npm run market -- price mirage_prime_set
npm run market -- snapshot
npm run market -- pull --force
npm run market -- changes
```

Daily automation: [`.github/workflows/market-daily-prices.yml`](.github/workflows/market-daily-prices.yml) runs near 4pm Pacific, writes `data/market/`, and commits when there are updates. Edit [`config/market-watchlist.json`](config/market-watchlist.json) to change tracked items.

## Patch notes CLI (updates / hotfixes)

```bash
npm run patches -- status
npm run patches -- latest
npm run patches -- pull --force
npm run patches -- changes
```

Source: [warframe.com/en/patch-notes](https://www.warframe.com/en/patch-notes). Daily automation: [`.github/workflows/patch-notes-daily.yml`](.github/workflows/patch-notes-daily.yml) writes `data/patches/` near 4pm Pacific.

## Library usage

```ts
import {
  WarframeStatusClient,
  WarframeMarketClient,
  PatchNotesClient,
} from "./src/index.ts";

const status = new WarframeStatusClient(); // platform: pc
const summary = await status.getSummary();

const market = new WarframeMarketClient();
const top = await market.getTopOrders("mirage_prime_set");

const patches = new PatchNotesClient();
const notes = await patches.listEntries();
```

## Desktop overlay (arsenal coaching)

Interactive always-on-top overlay for Warframe arsenal/mod screens: set a snip region, capture on hotkey, get prioritized Steel Path / endgame actions, and chat with the Build Agent in a minimizable panel while in-game. **Fully external** — separate window + desktop screenshots + HTTPS chat; no Warframe process touch. Set `OPENAI_API_KEY` in `~/.config/warframe-build-agent/overlay.env`. Verify with `python3 -m wf_overlay --verify-external`.

```bash
cd overlay
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 -m wf_overlay
```

Details: [`docs/overlay.md`](docs/overlay.md).

## Mobile web chat (on the go)

```bash
cd web
cp .env.example .env.local   # add OPENAI_API_KEY
npm install
npm run dev
```

Or from repo root: `npm run web:dev`

Optional `CHAT_PASSWORD` locks the UI for personal phone use. Deploy `web/` to Vercel (or similar) and open it on your phone — details in [`docs/web-chat.md`](docs/web-chat.md).

For deployed daily scrapes, set `MARKET_CHANGES_URL` / `PATCH_CHANGES_URL` to the raw `latest-changes.json` files committed by the 4pm Pacific Actions.

In the chat UI (and this agent chat), type **`/list`** for available commands — see [`docs/commands.md`](docs/commands.md).

## Hermes Desktop import

```bash
./scripts/pack-hermes-profile.sh
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
```

Or install the folder directly:

```bash
hermes profile install ./hermes --name warframe-build-agent --alias
```

Full notes: [`docs/hermes-export.md`](docs/hermes-export.md).

## Agent usage (Cursor)

Open this repo in Cursor and ask player-facing questions, for example:

- “Budget Steel Path build for Coda Hema”
- “Laetum vs Felarx for EDA”
- “What’s up for fissures / Cetus night right now?”
- “How did Mirage Prime Set move vs yesterday’s market snapshot?”

For live data, prefer `npm run wf -- …`, `npm run market -- …`, and `npm run patches -- …`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run wf -- <cmd>` | World-state CLI |
| `npm run market -- <cmd>` | Warframe.market v2 CLI |
| `npm run patches -- <cmd>` | Official patch notes / hotfix checks |
| `npm run web:dev` | Mobile chat UI (local) |
| `npm run web:build` | Build chat UI |
| `python3 -m wf_overlay` (from `overlay/`) | Desktop arsenal overlay |
| `npm test` | Unit tests (mocked fetch + formatters) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Emit `dist/` |
| `./scripts/cleanup-verify.sh` | Post-change typecheck/tests gate |
| `./scripts/cleanup-verify-all.sh` / `npm run cleanup:verify:all` | Full `/cleanup-simplify -all` integrity (overlay + web) |
| `npm run knowledge -- pull` | Build local offline wiki/Overframe knowledge pack |
| `npm run knowledge -- lookup <q>` | Query local knowledge pack |
| `/cleanup-simplify` (Cursor) | Cleanup subagent — see [`docs/cleanup-agent.md`](docs/cleanup-agent.md) |

## Source notes

Market prices, patch rankings, and live timers change. When sources disagree, see [`docs/sources.md`](docs/sources.md).
