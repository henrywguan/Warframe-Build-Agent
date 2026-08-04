# Command list (`/list`)

Type **`/list`** (or **`/help`**) in the mobile web chat or in this Cursor Warframe agent chat for the available commands.

This page is the full catalog.

---

## Mobile web chat slash commands

These run in the Ordis web UI without needing the model for tool dispatch:

| Command | What it does |
| --- | --- |
| `/list` | Show this command list |
| `/help` | Alias for `/list` |
| `/summary` | Live worldstate summary |
| `/fissures [sp\|steel] [tier]` | Live Void Fissures (optional Steel Path / relic tier) |
| `/cycles` | Open-world cycle timers |
| `/sortie` | Today's Sortie |
| `/invasions` | Active invasions + rewards |
| `/alerts` | Active alerts + rewards |
| `/market <slug>` | Live Warframe.market price (e.g. `mirage_prime_set`) |
| `/market-changes` | Daily 4pm Pacific market scrape changes |
| `/patches [n]` | Latest official updates/hotfixes |
| `/hotfix` | Alias for `/patches` |
| `/patch-changes` | Daily 4pm Pacific newly listed patch notes |
| `/knowledge <query>` | Offline knowledge pack lookup (no LLM) |
| `/compare <item> \| mods…` | Compare a pasted loadout to top 3 local Overframe builds |
| `/dps <weapon> [vs <weaponB>] [--preset …]` | Offline modded DPS estimate / A vs B compare |

Attach a loadout screenshot in the web UI to OCR/vision-read the Warframe/weapon + mods/arcanes and compare against top-3 cached Overframe builds.

Plain-language questions still work (builds, comparisons, mechanics). Offline **item facts** and local build comparisons use the `lookup_local_knowledge` tool. If local Overframe builds are missing, the agent asks yes/no before online Overframe/YouTube search — see [`docs/source-policy.md`](source-policy.md). For a no-OpenAI chatbot, set `CHAT_MODE=local` (see [`docs/web-chat.md`](web-chat.md)).

---

## Cursor / agent chat commands

These are Cursor slash commands / skills (not web-UI slash routes):

| Command | What it does |
| --- | --- |
| `/list` | Reply with this catalog (web slashes + CLI + Cursor commands) |
| `/help` | Alias for `/list` |
| `/cleanup-simplify` | Tidy the recent diff + run `./scripts/cleanup-verify.sh` |
| `/cleanup-simplify -all` | Tidy + full overlay/web integrity via `./scripts/cleanup-verify-all.sh` |
| `/knowledge` | Pull or query the offline knowledge pack (WFCD + Wiki + Overframe) |

Details:

- Cleanup docs: [`docs/cleanup-agent.md`](cleanup-agent.md) · Cursor command: [`.cursor/commands/cleanup-simplify.md`](../.cursor/commands/cleanup-simplify.md)
- Knowledge docs: [`docs/offline-knowledge.md`](offline-knowledge.md) · Overframe crawl: [`docs/overframe-crawl.md`](overframe-crawl.md) · Cursor command: [`.cursor/commands/knowledge.md`](../.cursor/commands/knowledge.md)

### Cursor skills (task playbooks)

| Skill | Use when |
| --- | --- |
| `cleanup-simplify` | After edits; optional `-all` integrity |
| `offline-knowledge` | Local pack lookup / pull / crawl |
| `recommend-build` | Mod setups / budget / Steel Path builds |
| `compare-gear` | Weapon/frame comparisons |
| `explain-mechanics` | Game systems explanations |
| `world-state` | Live fissures/cycles/alerts guidance |
| `patch-notes` | Updates/hotfixes workflow |

Hermes Desktop import ships the matching player-facing skills (v0.2.0) under `hermes/skills/warframe/` — see [`docs/hermes-export.md`](hermes-export.md).

---

## Local CLI commands

```bash
# World-state
npm run wf -- summary
npm run wf -- fissures --steel-path
npm run wf -- fissures --tier Neo
npm run wf -- cycles
npm run wf -- sortie
npm run wf -- invasions
npm run wf -- alerts

# Market
npm run market -- status
npm run market -- price mirage_prime_set
npm run market -- pull --force
npm run market -- changes

# Patch notes
npm run patches -- latest
npm run patches -- pull --force
npm run patches -- changes

# Offline knowledge pack / Overframe crawl
npm run knowledge -- status
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- lookup "rad viral or corrosive magnetic"
npm run knowledge -- dps "Coda Hema" --preset rifle-viral-heat
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
npm run knowledge -- pull
npm run knowledge -- pull-mechanics
npm run knowledge -- crawl-overframe
npm run knowledge:export-overframe -- --limit 5
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/examples/builds-import.sample.json

# Web + overlay
npm run web:dev
cd overlay && python3 -m wf_overlay

# Verify / cleanup gates
npm run cleanup:verify
npm run cleanup:verify:all
./scripts/cleanup-verify.sh
./scripts/cleanup-verify-all.sh

# Tests / types
npm test
npm run typecheck
npm run web:test
```

Market + patch scrapes refresh around **4pm Pacific**.

---

## How agents should answer `/list`

When the user types `/list` or `/help`, reply with:

1. **Web slash commands** (table above)
2. **Cursor commands**: `/cleanup-simplify`, `/cleanup-simplify -all`, `/knowledge`
3. **Useful CLI** shortcuts (wf / market / patches / knowledge / cleanup verify)
4. Note that market + patch scrapes refresh around **4pm Pacific**
5. Point to this file for the full catalog: [`docs/commands.md`](commands.md)
