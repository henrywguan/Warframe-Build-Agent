# Offline knowledge pack (agent-usable)

Local recall pack for builds and item facts — **text/structured data only** (no wiki images). A full wiki+catalog pack is typically only a few MB; Overframe top-build text stays small unless you import a large build dump.

## What’s inside (`data/knowledge/`)

| Path | Source | Purpose |
| --- | --- | --- |
| `catalog/items.json` | [WFCD / warframestat.us](https://api.warframestat.us) | Warframes + weapons (incl. primes), slim stats |
| `wiki/digests/*.json` | [Warframe Wiki API](https://wiki.warframe.com) | Plain-text digests per item |
| `builds/by-item/*.json` | [Overframe](https://overframe.gg) crawl | Top 3 community builds per item (**mods + arcanes**) |
| `mods/index.json` | Aggregated from crawled builds | Unique mods/arcanes seen on top builds |
| `official/digests/*.json` | [warframe.com](https://www.warframe.com) | Patch hub + news digests for local chatbot recall |
| `mechanics/digests/*.json` | [Warframe Wiki](https://wiki.warframe.com) | Curated mechanics/resource pages (Damage, Status, Armor, factions, Forma, relics, …) |
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

# Dev sample
npm run knowledge -- pull --limit 25

# If Overframe is Cloudflare-blocked (common on datacenter IPs / Node fetch):
npm run knowledge:export-overframe -- --limit 5
npm run knowledge:export-overframe -- --resume
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
# Or import a hand-written / sample JSON:
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/examples/builds-import.sample.json

# Lookup (items + mechanics)
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- lookup "rad viral or corrosive magnetic"

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

### Modded DPS calculator

`data/knowledge/dps/common-mods.json` holds curated max-rank mod multipliers. The calculator estimates **burst + sustained DPS** for one weapon or an A vs B compare under a shared mod list/preset (e.g. `rifle-viral-heat`, `typical`).

```bash
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
```

This is arsenal-style guidance (direct damage, crit, multishot, fire rate, reload, simple elemental combines, optional Viral amp). It is **not** a full simulator (no slash DoT ticks, full armor TTK, rivens, most arcanes, incarnon transforms, or galvanized stacks).

### Overframe note

`overframe.gg` often returns a Cloudflare challenge from cloud/CI networks. The crawler detects that (`overframeStatus: "blocked"`) and still allows wiki/catalog pulls. To fill builds with mods/arcanes:

1. Run `npm run knowledge -- crawl-overframe` on a machine that can open Overframe in a browser, **or**
2. Provide `--import-builds` JSON (see `data/knowledge/examples/builds-import.sample.json`).

Full crawl process: [`docs/overframe-crawl.md`](overframe-crawl.md).

## Agent use

- Web chat tools: `lookup_local_knowledge`, `compare_loadout_to_overframe`
- Web slash: `/knowledge <query>`, `/compare <item> | mods…`, screenshot Attach
- Local chatbot (no OpenAI): set `CHAT_MODE=local` in `web/.env.local`
- CLI: `npm run knowledge -- lookup …`
- Cursor skill: `.cursor/skills/offline-knowledge/SKILL.md`

Prefer local knowledge for **item/mechanic facts** and **build comparisons** first. If Overframe builds are missing from the pack, ask the player for confirmation before searching Overframe / YouTube / online sources — see [`docs/source-policy.md`](source-policy.md). Keep using live tools for fissures, market, and patch hubs.
