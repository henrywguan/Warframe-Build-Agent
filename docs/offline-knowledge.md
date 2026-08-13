# Offline knowledge pack

Local facts Ordis (and the web/CLI tools) read from disk — **text only**, no wiki images.

**New here?** Start with [`getting-started.md`](getting-started.md).  
**Hermes users:** after import, keep this pack fresh so lookups stay accurate — see [`hermes-export.md`](hermes-export.md).

A full catalog + digests pack is usually only a few MB. Overframe build text stays small unless you import a large dump.

## What’s inside (`data/knowledge/`)

| Path | Source | Purpose |
| --- | --- | --- |
| `catalog/items.json` | [WFCD / warframestat.us](https://api.warframestat.us) | Warframes + weapons (incl. primes), slim stats |
| `wiki/digests/*.json` | [Warframe Wiki API](https://wiki.warframe.com) | Plain-text digests per item |
| `builds/by-item/*.json` | [Overframe](https://overframe.gg) crawl | Top 3 community builds per item (**mods + arcanes**) |
| `mods/index.json` | Aggregated from crawled builds | Unique mods/arcanes seen on top builds |
| `official/digests/*.json` | [warframe.com](https://www.warframe.com) | Patch hub + news digests for local chatbot recall |
| `mechanics/digests/*.json` | [Warframe Wiki](https://wiki.warframe.com) | Curated mechanics/resource pages (Damage, Status, Armor, factions, Forma, relics, …) |
| `arcanes/digests/*.json` | [Warframe Wiki](https://wiki.warframe.com) | Arcane Enhancement digests (Warframe/Primary/Secondary/Melee/Magus/Virtuos/…) |
| `manifest.json` | Generator metadata | Counts + Overframe status |

## Pull

```bash
# Full catalog + wiki digests + Overframe top builds (mods + arcanes)
npm run knowledge -- pull

# Dedicated Overframe crawl (top 3 builds → scan mods/arcanes → local DB)
npm run knowledge -- crawl-overframe
npm run knowledge -- crawl-overframe --limit 10

# Mechanics + resource digests only (Damage/Status/Armor/factions/… — fast)
npm run knowledge -- pull-mechanics

# Arcane Enhancement digests (Warframe Wiki category)
npm run knowledge -- pull-arcanes

# Dev sample
npm run knowledge -- pull --limit 25

# If Overframe is Cloudflare-blocked (common on datacenter IPs / Node fetch):
npm run knowledge:export-overframe -- --limit 5
npm run knowledge:export-overframe -- --resume
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
# Or import a hand-written / sample JSON:
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/examples/builds-import.sample.json

# Lookup (items + mechanics + arcanes)
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- lookup "rad viral or corrosive magnetic"
npm run knowledge -- lookup "Arcane Energize"

# Offline modded DPS calculator (arsenal-style estimate)
npm run knowledge -- dps "Coda Hema" --preset rifle-viral-heat
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
npm run knowledge -- status
```

### Mechanics pack

`pull-mechanics` (also part of full `pull`) fetches curated Wiki pages into `data/knowledge/mechanics/`:

- Damage types: Viral, Corrosive, Magnetic, Radiation, Heat/Cold/Toxin/Electricity/Gas/Blast, IPS
- Status Effect, Armor, Shields, Health, Critical Hit, enemy scaling
- Factions, Steel Path, Archon Hunt, mods/arcanes/Forma, Kuva/Endo/relics

These are what let a local chatbot answer elemental stacking questions without OpenAI.

### Arcane digests

`pull-arcanes` fetches every page under Wiki `Category:Arcane Enhancements` (plus the overview), tagged by slot family (`warframe`, `primary`, `secondary`, `melee`, `operator`, `amp`, `kitgun`, `zaw`).

```bash
npm run knowledge -- pull-arcanes
npm run knowledge -- lookup "Arcane Energize"
npm run knowledge -- lookup "Primary Merciless"
```

### Modded DPS calculator

`data/knowledge/dps/common-mods.json` holds curated max-rank mod multipliers (**asOf 2026-08-03**). Steel Path presets prefer **Galvanized Aptitude + Galvanized Chamber** over Serration/Split Chamber. The calculator estimates **burst + sustained DPS** for one weapon or an A vs B compare under a shared mod list/preset (e.g. `rifle-viral-heat`, `rifle-viral-electric`, `typical`, `rifle-budget`).

```bash
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
npm run knowledge -- dps "Enkaus" --preset rifle-viral-electric
```

This is arsenal-style guidance (direct damage, crit, multishot, fire rate, reload, simple elemental combines, optional Viral amp). It is **not** a full simulator (no slash DoT ticks, full armor TTK, rivens, most arcanes, incarnon transforms, or galvanized stacks).

### Overframe note

`overframe.gg` is Cloudflare-protected (often even on home Wi‑Fi). There is no public API. Prefer **Cloudflare-safe extract**:

1. Open Overframe in a normal browser, pass the challenge, then either:
   - paste [`scripts/overframe-browser-extract.js`](../scripts/overframe-browser-extract.js) in the DevTools console, or
   - save the page as HTML and run `npm run knowledge -- parse-overframe-html <file|dir> --import`
2. Or attach Playwright to that browser via CDP (`npm run knowledge:export-overframe -- --connect …`).

Full guide: [`docs/overframe-crawl.md`](overframe-crawl.md).

## Agent use

- Web chat tools: `lookup_local_knowledge`, `compare_loadout_to_overframe`, `estimate_modded_dps`
- Web slash: `/knowledge <query>`, `/compare <item> | mods…`, `/dps …`, screenshot Attach
- Local LLM (Qwen/Ollama): set `OPENAI_BASE_URL` + `OPENAI_MODEL` in `web/.env.local` — still uses the tools above
- Deterministic no-LLM chatbot: `CHAT_MODE=local` in `web/.env.local`
- CLI: `lookup`, `compare-loadout`, `dps`, `compare-dps`, `pull-mechanics`, `pull-arcanes`
- Hermes: profile v0.4.2 (always online) + [`hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md); pack with `./scripts/pack-hermes-profile.sh`
- Cursor skill: `.cursor/skills/offline-knowledge/SKILL.md`

Prefer local knowledge for **item/mechanic/arcane facts**, **loadout compares**, and **DPS estimates** first. If Overframe builds are missing from the pack, enable the WebUI **Online search** toggle for a live crawl (never ask the player to type yes/no) — see [`docs/source-policy.md`](source-policy.md). Keep using live tools for fissures, market, and patch hubs.
