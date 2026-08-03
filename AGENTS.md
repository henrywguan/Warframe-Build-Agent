# Warframe Build Agent

Help players make better Warframe decisions: compare gear, recommend builds, explain mechanics, and interpret live world-state data.

## Project layout

| Path | Purpose |
| --- | --- |
| `.cursor/rules/` | Always-on advisor behavior |
| `.cursor/skills/` | Task playbooks (compare, builds, mechanics, world-state, cleanup) |
| `.cursor/agents/` | Cursor subagents (e.g. cleanup-simplify) |
| `docs/cleanup-agent.md` | Cleanup subagent + git-change automation |
| `scripts/cleanup-verify.sh` | Post-cleanup typecheck/tests gate |
| `docs/sources.md` | Source priority and caveats |
| `docs/warframe-status.md` | Status API fields players care about |
| `docs/warframe-market.md` | Warframe.market v2 pricing + daily 4pm Pacific pull |
| `docs/warframe-patch-notes.md` | Official updates/hotfixes + daily 4pm Pacific check |
| `docs/commands.md` | `/list` command catalog for web + agent chat |
| `config/market-watchlist.json` | Items tracked for daily price snapshots |
| `data/market/` | Saved daily market snapshots / day-over-day changes |
| `data/patches/` | Saved daily patch-note snapshots / new-entry diffs |
| `data/knowledge/` | Offline agent-usable wiki digests + Overframe top builds |
| `docs/offline-knowledge.md` | How to pull/query the local knowledge pack |
| `docs/overframe-crawl.md` | Crawl Overframe top-2 builds + mods/arcanes into local DB |
| `docs/source-policy.md` | Offline facts vs Overframe / YouTube / agent-calculated builds |
| `src/` | Status, Market, and Patch Notes clients + CLIs |
| `web/` | Mobile-friendly chat UI (OpenAI-compatible backend + live tools) |
| `hermes/` | Hermes Desktop/CLI profile distribution (SOUL + skills) |
| `exports/` | Packed Hermes profile archive(s) |
| `docs/web-chat.md` | How to run/deploy the on-the-go chat UI |
| `docs/hermes-export.md` | How to import this agent into Hermes Desktop |
| `overlay/` | Desktop arsenal overlay (external region capture + action recommendations; no memory editing) |
| `docs/overlay.md` | Overlay usage + external-only policy / `--verify-external` safeguards |

## Default assumptions

- **Platform:** `pc` (Warframe is cross-play; mobile/PC share the same worldstate path used here).
- Prefer accessible recommendations unless the user asks for min-max / Steel Path / endgame.
- Treat market prices, patch ranks, and live timers as changeable.

## Commands

Player-facing chat commands (mobile web + this agent chat): type **`/list`**. Full catalog: [`docs/commands.md`](docs/commands.md).

```bash
npm install
npm run wf -- summary
npm run wf -- fissures --steel-path
npm run wf -- sortie
npm run wf -- cycles
npm run market -- status
npm run market -- price mirage_prime_set
npm run market -- pull --force
npm run market -- changes
npm run patches -- latest
npm run patches -- pull --force
npm run patches -- changes
npm run web:dev
./scripts/pack-hermes-profile.sh
npm test
cd overlay && python3 -m wf_overlay
./scripts/cleanup-verify.sh
./scripts/cleanup-verify-all.sh
npm run knowledge -- pull
npm run knowledge -- crawl-overframe
npm run knowledge -- lookup "Coda Hema"
```

After substantive code edits, run the **cleanup-simplify** subagent (`/cleanup-simplify`) so touched code stays simple and verification stays green. For overlay + web integrity, use `/cleanup-simplify -all` (`./scripts/cleanup-verify-all.sh`). Details: [`docs/cleanup-agent.md`](docs/cleanup-agent.md).

## How to answer players

1. Identify the goal (compare, build, mechanic, progression, trade, live status).
2. Ground claims in repo sources first (`docs/`), then Status CLI/API, then current public web info.
3. Lead with a clear recommendation, then tradeoffs.
4. End with one short next-step suggestion.

Full behavior rules live in `.cursor/rules/warframe-advisor.mdc`. Use the matching skill under `.cursor/skills/` for the task type.
