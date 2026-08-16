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
| `docs/commands.md` | Full `/list` catalog (web, Cursor, CLI) |
| `docs/cleanup-agent.md` | `/cleanup-simplify` and `/cleanup-simplify -all` |
| `.cursor/commands/` | Cursor slash commands (`cleanup-simplify`, `knowledge`) |
| `config/market-watchlist.json` | Items tracked for daily price snapshots |
| `data/market/` | Saved daily market snapshots / day-over-day changes |
| `data/patches/` | Saved daily patch-note snapshots / new-entry diffs |
| `data/knowledge/` | Offline agent-usable wiki digests + Overframe top builds |
| `docs/offline-knowledge.md` | How to pull/query the local knowledge pack |
| `docs/overframe-crawl.md` | Crawl Overframe top-3 builds + mods/arcanes into local DB |
| `docs/source-policy.md` | Offline facts vs Overframe / YouTube / agent-calculated builds |
| `src/` | Status, Market, and Patch Notes clients + CLIs |
| `web/` | Mobile-friendly chat UI (OpenAI-compatible backend + live tools) |
| `hermes/` | Hermes Desktop/CLI profile distribution (SOUL + skills) |
| `exports/` | Packed Hermes profile archive(s) |
| `docs/web-chat.md` | How to run/deploy the on-the-go chat UI |
| `docs/hosting.md` | Public URL + OpenAI hosting (Vercel / Fly / VPS) |
| `Dockerfile` / `fly.toml` | Container + Fly.io deploy for the web chat + knowledge pack |
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
npm run wf -- baro
npm run wf -- nightwave
npm run wf -- archon
npm run wf -- arbitration
npm run wf -- darvo
npm run wf -- construction
npm run market -- status
npm run market -- price mirage_prime_set
npm run market -- slug-search "Mirage Prime set"
npm run market -- pull --force
npm run market -- changes
npm run patches -- latest
npm run patches -- detail 43.0.8
npm run patches -- pull --force
npm run patches -- changes
npm run web:dev
./scripts/pack-hermes-profile.sh
./scripts/pack-hermes-profile.sh --with-knowledge
npm test
cd overlay && python3 -m wf_overlay
./scripts/cleanup-verify.sh
./scripts/cleanup-verify-all.sh
npm run knowledge -- pull
npm run knowledge -- pull-mechanics
npm run knowledge -- pull-arcanes
npm run knowledge -- crawl-overframe
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- farm "Enkaus"
npm run knowledge -- builds "Coda Hema"
npm run knowledge -- preset-list
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
npm run knowledge -- compare-loadout "Coda Hema" --mods "Serration,Split Chamber" --arcanes "Primary Merciless"
npm run knowledge -- ehp --health 500 --shields 300 --armor 300
npm run knowledge -- forma --needed 74
npm run knowledge -- relic "Mirage Prime" --refinement radiant
npm run knowledge -- farm-vs-buy "Mirage Prime Neuroptics"
```

After substantive code edits, run the **cleanup-simplify** subagent (`/cleanup-simplify`) so touched code stays simple and verification stays green. For overlay + web integrity, use `/cleanup-simplify -all` (`./scripts/cleanup-verify-all.sh`). Details: [`docs/cleanup-agent.md`](docs/cleanup-agent.md).

## How to answer players

1. Identify the goal (compare, build, mechanic, arcane, DPS, loadout, progression, trade, live status).
2. Ground claims in the **offline knowledge pack** first (`npm run knowledge -- lookup|dps|compare-dps|compare-loadout|ehp|forma|relic|…`), then `docs/` / Status / Market / Patches. When local Overframe builds are missing: **web chat** honors the Online search toggle; **Hermes is always online** and crawls immediately — never ask the player to type yes/no.
3. Lead with a clear recommendation, then tradeoffs.
4. End with one short next-step suggestion.

Full behavior rules live in `.cursor/rules/warframe-advisor.mdc`. Use the matching skill under `.cursor/skills/` for the task type.

## Cursor Cloud specific instructions

Dependency install (root npm, `web/` npm, and overlay pip) is handled by the startup update script; standard commands live in the `## Commands` section above and in `package.json`. Notes below are the non-obvious caveats for running things here.

- **Three services, one long-running server.** The only local server is the Next.js web chat on port `3000` (`npm run web:dev`). The `src/` clients (`wf`/`market`/`patches`/`knowledge`) and the `overlay/` are invoked on demand; there is no database or other backing service to start.
- **Web chat works without an API key for slash commands.** `/api/health` and slash commands (`/cycles`, `/market <slug>`, `/patches`, `/fissures`, etc.) are handled server-side without the LLM, so they run with no `OPENAI_API_KEY`. Plain-language questions need either `OPENAI_API_KEY` (+ optional `OPENAI_BASE_URL`/`OPENAI_MODEL` for local Qwen/Ollama) or `CHAT_MODE=local` for the deterministic pack chatbot — see [`docs/web-chat.md`](docs/web-chat.md) and Hermes local setup in [`hermes/LOCAL_LLM.md`](hermes/LOCAL_LLM.md). `web/.env.local` is not required for the server to boot.
- **Live data needs outbound network.** CLIs and web tools call `api.warframestat.us`, `api.warframe.market`, and `www.warframe.com`. These reach the internet from the cloud VM.
- **`knowledge crawl-overframe` is blocked from datacenter IPs.** overframe.gg returns a Cloudflare bot challenge from this network, so `npm run knowledge -- crawl-overframe`/`status` report `overframeStatus: partial` and fall back to the sample import — this is expected here, not a setup failure. Wiki-digest and other pulls also depend on outbound access.
- **Overlay is a desktop GUI that cannot display in the cloud VM.** Do not try to open the window. Run its tests headless with `QT_QPA_PLATFORM=offscreen` (e.g. `cd overlay && QT_QPA_PLATFORM=offscreen python3 -m unittest discover -s tests`), and use `python3 -m wf_overlay --verify-external` for the external-only/anti-cheat policy check.
- **PySide6/Qt needs system libraries** that are not installed by pip. If overlay imports fail with `libEGL.so.1: cannot open shared object file` (or similar Qt xcb errors), install: `libegl1 libgl1 libxkbcommon0 libdbus-1-3 libglib2.0-0 libfontconfig1 libxrender1 libxcb-cursor0 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 libxcb-shape0 libxcb-xinerama0 libnss3`. These are OS packages (kept out of the update script) and are expected to persist in the VM image.
- **Full verification gate:** `./scripts/cleanup-verify.sh` (typecheck + root tests, plus web/overlay if present) and `./scripts/cleanup-verify-all.sh` (adds overlay offscreen tests + web lint/test/build). Both auto-install missing `node_modules`.
