# Warframe Build Agent — Hermes profile distribution

This folder is a **Hermes Agent profile distribution** you can import into Hermes Desktop / CLI.

**Profile version:** `0.2.0`

## Install options

### A) Import the packed archive (best for Desktop)

From the repo root:

```bash
./scripts/pack-hermes-profile.sh
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
```

In Hermes Desktop: use **Profiles → Import** (or the CLI above) and select the `.tar.gz`.

### B) Install from this folder

```bash
hermes profile install ./hermes --name warframe-build-agent --alias
```

### C) From a GitHub checkout

```bash
git clone https://github.com/henrywguan/Warframe-Build-Agent.git
hermes profile install ./Warframe-Build-Agent/hermes --name warframe-build-agent --alias
```

`hermes profile install <git-url>` expects `distribution.yaml` at the **repository root**, so for this monorepo use the local `hermes/` path or the packed `.tar.gz` instead.

## After install

```bash
hermes profile use warframe-build-agent
# or:
hermes -p warframe-build-agent chat
```

Fill any provider keys in that profile’s `.env`.

Point the profile `terminal.cwd` at a checkout of this repo so Ordis can run:

- `npm run wf` / `npm run market` / `npm run patches`
- `npm run knowledge -- lookup|pull|crawl-overframe` (offline pack under `data/knowledge/`)

## What’s included

| Path | Role |
| --- | --- |
| `SOUL.md` | Ordis identity + source policy |
| `skills/warframe/compare-gear` | Gear comparisons |
| `skills/warframe/recommend-build` | Builds (local pack first; ask before online) |
| `skills/warframe/explain-mechanics` | Game systems |
| `skills/warframe/world-state` | Live Status |
| `skills/warframe/market-prices` | Warframe.market |
| `skills/warframe/patch-notes` | Updates / hotfixes |
| `skills/warframe/offline-knowledge` | Local knowledge pack lookup / crawl |
| `distribution.yaml` | Hermes distribution manifest (`0.2.0`) |
| `config.yaml` | Light defaults |

## What is **not** bundled

- Full `data/knowledge/` pack (regenerate with `npm run knowledge -- pull` / `crawl-overframe`)
- Next.js web UI (`web/`) and desktop overlay (`overlay/`)
- API keys
