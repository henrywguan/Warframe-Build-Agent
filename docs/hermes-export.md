# Exporting this agent to Hermes Desktop

Yes — this repo includes a Hermes-compatible profile distribution.

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

- `SOUL.md` — Warframe Build Agent identity (system prompt slot #1)
- Skills under `skills/warframe/`:
  - `compare-gear`
  - `recommend-build`
  - `explain-mechanics`
  - `world-state`
  - `market-prices`
- Reference docs for Status / Market / source priority

## What Hermes does **not** get automatically

- Your API keys (add them in the profile `.env`)
- The Next.js web UI (`web/`) — that’s separate; Hermes Desktop is the chat surface here
- Guaranteed shell access to `npm run wf` / `npm run market` unless you set the profile terminal cwd to this repo checkout

## Skills-only install

If you only want the skills on an existing Hermes profile:

```bash
mkdir -p ~/.hermes/skills/warframe
cp -R hermes/skills/warframe/* ~/.hermes/skills/warframe/
# and/or copy SOUL.md ideas into ~/.hermes/SOUL.md carefully
```

Or install individual SKILL.md URLs once published on a raw GitHub path:

```bash
hermes skills install https://raw.githubusercontent.com/<org>/<repo>/main/hermes/skills/warframe/compare-gear/SKILL.md
```

## Verify

```bash
hermes -p warframe-build-agent skills list
hermes -p warframe-build-agent chat -q "Budget Steel Path primary ideas"
```
