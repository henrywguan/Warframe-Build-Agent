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

### C) Install from GitHub (after merge)

```bash
hermes profile install github.com/henrywguan/Warframe-Build-Agent --name warframe-build-agent --alias
```

Note: `hermes profile install` expects `distribution.yaml` at the **source root**. If installing from the full monorepo, prefer option A/B (`./hermes`) until/unless this distribution is published as its own repo or subdirectory workflow.

If your Hermes version supports a subdirectory/path install, point it at the `hermes/` directory of this repository.

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
