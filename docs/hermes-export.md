# Exporting this agent to Hermes Desktop

Yes — this repo includes a Hermes-compatible profile distribution (**v0.2.0**).

## Quick path (recommended)

1. Pack the profile archive:

```bash
./scripts/pack-hermes-profile.sh
```

2. Import into Hermes:

```bash
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
hermes profile use warframe-build-agent
```

In **Hermes Desktop**, use the Profiles import flow if available and select the same `.tar.gz`.

## Alternative: install the `hermes/` folder

```bash
hermes profile install ./hermes --name warframe-build-agent --alias
```

## What Hermes gets

- `SOUL.md` — Ordis / Warframe Build Agent identity (source policy included)
- Skills under `skills/warframe/`:
  - `compare-gear`
  - `recommend-build` (+ local-first / ask-before-online source policy)
  - `explain-mechanics`
  - `world-state`
  - `market-prices`
  - `patch-notes`
  - `offline-knowledge`
- Reference docs for Status / Market / sources / source policy

## What Hermes does **not** get automatically

- Your API keys (add them in the profile `.env`)
- The Next.js web UI (`web/`) or arsenal overlay (`overlay/`)
- The full offline knowledge pack (`data/knowledge/`) — regenerate in a repo checkout:
  - `npm run knowledge -- pull`
  - `npm run knowledge -- crawl-overframe` (residential network; Cloudflare often blocks CI)
- Guaranteed shell access to CLIs unless you set the profile terminal cwd to this repo checkout

## Skills-only install

If you only want the skills on an existing Hermes profile:

```bash
mkdir -p ~/.hermes/skills/warframe
cp -R hermes/skills/warframe/* ~/.hermes/skills/warframe/
# and/or merge SOUL.md ideas into ~/.hermes/SOUL.md carefully
```

## Verify

```bash
hermes -p warframe-build-agent skills list
hermes -p warframe-build-agent chat -q "Budget Steel Path primary ideas"
```

After import, re-check that skills include `offline-knowledge` and `patch-notes`, and that Ordis asks before online build search when the local Overframe cache is empty.
