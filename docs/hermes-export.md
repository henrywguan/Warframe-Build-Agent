# Exporting this agent to Hermes Desktop

Yes — this repo includes a Hermes-compatible profile distribution (**v0.3.0**) that works with **local LLMs** (Qwen 3.6 via Ollama / LM Studio / any OpenAI-compatible server) and the full offline knowledge pack.

## Quick path (recommended)

1. Clone/checkout this repo and install deps (`npm install`).
2. Confirm the offline pack: `npm run knowledge -- status`
3. Pack + import the Hermes profile:

```bash
./scripts/pack-hermes-profile.sh
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
hermes profile use warframe-build-agent
```

In **Hermes Desktop**, use the Profiles import flow if available and select the same `.tar.gz`.

4. Point the profile `terminal.cwd` at this **repo root** so Ordis can run knowledge/wf/market/patches CLIs.
5. Configure Hermes for your local model — see [`hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md).

### Local Qwen (Ollama) sketch

```bash
ollama pull qwen3.6
# Hermes provider → OpenAI-compatible base http://127.0.0.1:11434/v1
# OPENAI_API_KEY=ollama   OPENAI_MODEL=qwen3.6
```

## Alternative: install the `hermes/` folder

```bash
hermes profile install ./hermes --name warframe-build-agent --alias
```

## What Hermes gets

- `SOUL.md` — Ordis identity + source policy (local-pack first)
- `LOCAL_LLM.md` — Qwen / Ollama / LM Studio setup
- Skills under `skills/warframe/`:
  - `compare-gear`
  - `recommend-build` (local-first / ask-before-online)
  - `explain-mechanics` (lookup mechanics digests first)
  - `offline-knowledge` (items + mechanics + arcanes)
  - `loadout-compare` (pasted mods vs top Overframe builds)
  - `modded-dps` (offline DPS / A vs B)
  - `world-state`
  - `market-prices`
  - `patch-notes`

## Full local knowledge (required for best answers)

The lean profile tarball does **not** embed `data/knowledge/` (regenerable; ~several MB). Use a repo checkout:

| Content | How to refresh |
| --- | --- |
| Catalog + wiki digests | `npm run knowledge -- pull --skip-overframe` |
| Mechanics digests | `npm run knowledge -- pull-mechanics` |
| Arcane digests | `npm run knowledge -- pull-arcanes` |
| Overframe top-3 builds | `npm run knowledge -- crawl-overframe` (residential IP) |
| Optional sidecar tarball | `./scripts/pack-knowledge-sidecar.sh` or `./scripts/pack-hermes-profile.sh --with-knowledge` |

Ordis should prefer these CLIs over inventing facts:

```bash
npm run knowledge -- lookup "Arcane Energize"
npm run knowledge -- lookup "rad viral or corrosive magnetic"
npm run knowledge -- compare-loadout "Coda Hema" --mods "Serration,Split Chamber" --arcanes "Primary Merciless"
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
```

## What Hermes does **not** get automatically

- Your API keys (add them in the profile `.env` / provider UI)
- The Next.js web UI (`web/`) or arsenal overlay (`overlay/`) — optional; same pack + local LLM work there too (`docs/web-chat.md`)
- Guaranteed shell access unless `terminal.cwd` points at this checkout
- Screenshot OCR (use web Attach, or paste mod names into `compare-loadout`)

## Skills-only install

```bash
mkdir -p ~/.hermes/skills/warframe
cp -R hermes/skills/warframe/* ~/.hermes/skills/warframe/
# and/or merge SOUL.md ideas into ~/.hermes/SOUL.md carefully
```

## Verify

```bash
hermes -p warframe-build-agent skills list
npm run knowledge -- status
hermes -p warframe-build-agent chat -q "Lookup Arcane Energize from the local pack"
```

After import, confirm skills include `offline-knowledge`, `loadout-compare`, `modded-dps`, and that Ordis asks before online build search when the local Overframe cache is empty.
