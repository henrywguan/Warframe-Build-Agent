# Warframe Build Agent — Hermes profile distribution

This folder is a **Hermes Agent profile distribution** you can import into Hermes Desktop / CLI.

**Profile version:** `0.3.0` — local-LLM friendly (Qwen / Ollama / OpenAI-compatible) + full offline knowledge CLI surface.

## Install options

### A) Import the packed archive (best for Desktop)

From the repo root:

```bash
./scripts/pack-hermes-profile.sh
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
```

Optional knowledge sidecar (same time):

```bash
./scripts/pack-hermes-profile.sh --with-knowledge
```

In Hermes Desktop: use **Profiles → Import** (or the CLI above) and select the `.tar.gz`.

### B) Install from this folder

```bash
hermes profile install ./hermes --name warframe-build-agent --alias
```

### C) From a GitHub checkout

```bash
git clone https://github.com/henrywguan/Warframe-Build-Agent.git
cd Warframe-Build-Agent && npm install
hermes profile install ./hermes --name warframe-build-agent --alias
```

`hermes profile install <git-url>` expects `distribution.yaml` at the **repository root**, so for this monorepo use the local `hermes/` path or the packed `.tar.gz` instead.

## After install

```bash
hermes profile use warframe-build-agent
# or:
hermes -p warframe-build-agent chat
```

1. Point profile `terminal.cwd` at this **repo root**.
2. Configure a **local model** (recommended): see [`LOCAL_LLM.md`](LOCAL_LLM.md) for Qwen 3.6 / Ollama / LM Studio.
3. Verify pack: `npm run knowledge -- status`.

## What’s included

| Path | Role |
| --- | --- |
| `SOUL.md` | Ordis identity + source policy |
| `LOCAL_LLM.md` | Local Qwen / OpenAI-compatible setup |
| `skills/warframe/compare-gear` | Gear comparisons (+ DPS CLI) |
| `skills/warframe/recommend-build` | Builds (local pack first; ask before online) |
| `skills/warframe/explain-mechanics` | Systems via mechanics digests |
| `skills/warframe/offline-knowledge` | Items + mechanics + arcanes lookup |
| `skills/warframe/loadout-compare` | Pasted loadout vs Overframe top builds |
| `skills/warframe/modded-dps` | Offline modded DPS / A vs B |
| `skills/warframe/world-state` | Live Status |
| `skills/warframe/market-prices` | Warframe.market |
| `skills/warframe/patch-notes` | Updates / hotfixes |
| `distribution.yaml` | Hermes distribution manifest (`0.3.0`) |
| `config.yaml` | Light defaults |

## What is **not** bundled in the lean profile

- Full `data/knowledge/` pack — use the repo checkout, or `./scripts/pack-knowledge-sidecar.sh`
- Next.js web UI (`web/`) and desktop overlay (`overlay/`)
- Cloud API keys (local Ollama typically uses a dummy key)

## Operator commands Ordis should run

```bash
npm run knowledge -- lookup "Primary Merciless"
npm run knowledge -- compare-loadout "Coda Hema" --mods "Serration,Split Chamber" --arcanes "Primary Merciless"
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
npm run wf -- summary
```
