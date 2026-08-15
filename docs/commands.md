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
| `/model` | Show the LLM model id for this chat session |
| `/summary` | Live worldstate summary |
| `/fissures [sp\|steel] [tier]` | Live Void Fissures (optional Steel Path / relic tier) |
| `/cycles` | Open-world cycle timers |
| `/sortie` | Today's Sortie |
| `/invasions` | Active invasions + rewards |
| `/alerts` | Active alerts + rewards |
| `/baro` | Baro Ki'Teer location / inventory |
| `/nightwave` | Nightwave challenges |
| `/archon` / `/weekly` | Weekly Archon Hunt |
| `/event` | Active worldstate events |
| `/duviri` / `/circuit` | Duviri / Circuit guidance stub (+ cycles tip) |
| `/build <item>` | Top local Overframe/import builds |
| `/farm <item>` | Acquisition notes from wiki digest |
| `/arcanes <name\|slot>` | Local Arcane digests |
| `/preset list` | List curated DPS presets + `asOf` |
| `/preset <name> <weapon>` | Run a DPS preset on a weapon |
| `/focus` / `/shards [frame]` | Archon shard guidance stub |
| `/vendor <syndicate>` | Standing gift priorities stub |
| `/slug <item name>` | Resolve Warframe.market slug |
| `/market <slug>` | Live Warframe.market price (e.g. `mirage_prime_set`) |
| `/market-changes` | Daily 4pm Pacific market scrape changes |
| `/patches [n]` | Latest official updates/hotfixes (hub titles/links) |
| `/hotfix` | Alias for `/patches` |
| `/patch [version\|url\|latest]` | Full official patch-note text (synopsis source) |
| `/patch-changes` | Daily 4pm Pacific newly listed patch notes |
| `/arbitration` | Live Arbitration mission + timer |
| `/darvo` / `/daily-deals` | Darvo daily deals |
| `/construction` | Fomorian / Razorback construction progress |
| `/relic <query>` | Void Relic refinement odds + radshare tips |
| `/explain <topic>` | Mechanics explain stub → `/knowledge` |
| `/optimize <mode>` | Mission loadout tips stub (`archon\|sp\|netracell\|da\|eidolon\|pt\|arb\|circuit`) |
| `/ehp --health N --shields N --armor N …` | Effective HP estimate (offline) |
| `/forma --needed N [--current 60]` | Forma count heuristic (offline) |
| `/inventory <pasted list>` | Parse owned gear list (heuristic) |
| `/farm-vs-buy <item>` / `/buyvsfarm` | Farm route + market price tips |
| `/save-build <name> \| warframe: …` | Save a loadout card to the desktop **Saved Builds** pane (`/savebuild`, `/arsenal-save`) |
| `/profile` | Player profile stub (CLI / localStorage later) |
| `/knowledge <query>` | Offline knowledge pack lookup (no LLM) |
| `/compare <item> \| mods…` | Compare a pasted loadout to top 3 local Overframe builds |
| `/dps <weapon> [vs <weaponB>] [--preset …]` | Offline modded DPS estimate / A vs B compare |

Attach a loadout screenshot in the web UI to OCR/vision-read the Warframe/weapon + mods/arcanes and compare against top-3 cached Overframe builds.

Plain-language questions still work (builds, comparisons, mechanics). Offline **item facts** and local build comparisons use the `lookup_local_knowledge` tool. If local Overframe builds are missing, turn on **Online search** for a live Overframe/YouTube crawl (never type yes/no) — see [`docs/source-policy.md`](source-policy.md). For a no-OpenAI chatbot, set `CHAT_MODE=local` (see [`docs/web-chat.md`](web-chat.md)).

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
| `loadout-compare` | Pasted loadout vs top Overframe builds |
| `modded-dps` | Offline modded DPS / A vs B |
| `recommend-build` | Mod setups / budget / Steel Path builds |
| `compare-gear` | Weapon/frame comparisons |
| `explain-mechanics` | Game systems (pack digests first) |
| `world-state` | Live fissures/cycles/alerts guidance |
| `patch-notes` | Updates/hotfixes workflow |
| `farming-route` | How to obtain items / resources / quests |
| `budget-upgrade-path` | Midgame → Steel Path progression |
| `steel-path-loadout` | Full SP loadout packages |
| `faction-counter` | Damage types vs faction |
| `arcane-picker` | Weapon / frame arcanes |
| `riven-advisor` | Disposition + preferred stats |
| `incarnon-evolver` | Evolve challenges + priorities |
| `companion-setup` | Pets / primers for SP |
| `trade-value` | Market pricing workflow |
| `patch-impact` | Map patch notes to builds |
| `source-hygiene` | Local pack → consent → live crawl |
| `preset-curator` | Maintain `common-mods.json` asOf |
| `overframe-import` | Playwright / CDP import path |
| `screenshot-qa` | OCR loadout quality checks |
| `new-player-onboarding` | First-week guidance |
| `event-optimizer` | Timed event currency / farm plans |
| `relic-advisor` | Void Relic refinement + radshare |
| `farm-vs-buy` | Farm route vs market price |
| `loadout-optimize` | Mission-specific loadout packages |
| `arbitration-guide` | Live Arbitration + rotation tips |
| `helminth-picker` | Subsumed ability recommendations |
| `amp-setup` | Operator amp + Virtuos arcanes |
| `necramech-loadout` | Necramech mod builds |
| `railjack-setup` | Railjack hull / crew / armaments |
| `ehp-survivability` | Effective HP + DR priorities |
| `citation-check` | Source freshness + patch labels |
| `progression-profile` | MR / quest aware next steps |
| `forma-planner` | Forma / polarity spend estimate |
| `inventory-import` | Parse owned gear lists |
| `public-export-sync` | Refresh public game data stub |
| `damage-simulator` | DPS vs full damage explanations |

Hermes Desktop import ships a Cursor-class general agent skill pack plus Warframe + research skills (v0.6.0) under `hermes/skills/` — see [`docs/hermes-export.md`](hermes-export.md), [`hermes/CODING.md`](../hermes/CODING.md), and [`hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md).

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
npm run wf -- baro
npm run wf -- nightwave
npm run wf -- archon
npm run wf -- events
npm run wf -- arbitration
npm run wf -- darvo
npm run wf -- construction

# Market
npm run market -- status
npm run market -- price mirage_prime_set
npm run market -- slug-search "Mirage Prime set"
npm run market -- pull --force
npm run market -- changes

# Patch notes
npm run patches -- latest
npm run patches -- detail 43.0.8
npm run patches -- pull --force
npm run patches -- changes

# Offline knowledge pack / Overframe crawl
npm run knowledge -- status
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- farm "Enkaus"
npm run knowledge -- builds "Coda Hema"
npm run knowledge -- preset-list
npm run knowledge -- sync-mods --asOf 2026-08-03
npm run knowledge -- lookup "rad viral or corrosive magnetic"
npm run knowledge -- dps "Coda Hema" --preset rifle-viral-heat
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
npm run knowledge -- compare-loadout "Coda Hema" --mods "Serration,Split Chamber" --arcanes "Primary Merciless"
npm run knowledge -- pull
npm run knowledge -- pull-mechanics
npm run knowledge -- pull-arcanes
npm run knowledge -- crawl-overframe
npm run knowledge -- import-builds ./data/knowledge/builds-export.json
npm run knowledge -- ehp --health 500 --shields 300 --armor 300 [--dr 0.75]
npm run knowledge -- forma --needed 74 [--current 60] [--matching 4]
npm run knowledge -- relic "Mirage Prime" [--refinement radiant]
npm run knowledge -- inventory-parse "Soma Prime, Primed Flow"
npm run knowledge -- profile | profile-set --mr 16 --steel-path
npm run knowledge -- farm-vs-buy "Mirage Prime Neuroptics"
npm run knowledge -- pull-public-export
npm run knowledge:export-overframe -- --limit 5
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/examples/builds-import.sample.json
./scripts/pack-hermes-profile.sh
./scripts/pack-hermes-profile.sh --with-knowledge

# Web + overlay
npm run web:dev
npm run web:dev:lan
npm run web:build && npm run web:start:lan
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
