# Warframe Build Agent — Hermes profile distribution

This folder is a **Hermes Agent profile distribution** you can import into Hermes Desktop / CLI.

## Install options

### A) Import the packed archive (best for Desktop)

From the repo root:

```bash
./scripts/pack-hermes-profile.sh
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
```

In Hermes Desktop: use **Profiles → Import** (or the CLI above if the UI import is not available yet) and select the `.tar.gz`.

### B) Install from this folder

```bash
hermes profile install ./hermes --name warframe-build-agent --alias
```

### C) From a GitHub checkout

Clone this monorepo, then install the nested distribution folder (not the repo root):

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

Fill any provider keys in that profile’s `.env` (created from `.env.EXAMPLE` on install).

## What’s included

| Path | Role |
| --- | --- |
| `SOUL.md` | Warframe advisor identity / behavior |
| `skills/warframe/*` | Compare, build, mechanics, world-state, market skills |
| `distribution.yaml` | Hermes distribution manifest |
| `config.yaml` | Light defaults (your model settings stay local) |

Live Status/Market CLIs still live in the parent repo (`npm run wf`, `npm run market`). Point the profile `terminal.cwd` at a checkout of this repo if you want those commands handy.
