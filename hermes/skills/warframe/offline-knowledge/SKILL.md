---
name: offline-knowledge
description: Look up the local offline Warframe knowledge pack (wiki, mechanics, arcanes, Overframe builds) before inventing facts.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Wiki, Overframe, Offline, Mechanics, Arcanes]
    category: warframe
---

# Offline knowledge

## When to use

- Operator asks about frame/weapon facts, digests, mechanics, or arcanes
- Before inventing item stats or elemental advice from model memory
- Before recommending builds (local Overframe cache first)

Requires a Warframe-Build-Agent checkout with `data/knowledge/` populated (`terminal.cwd` → repo root).

## Pack contents (what lookup can answer)

- Catalog + Wiki digests (weapons/frames)
- Mechanics digests (Damage types, Status, Armor/Shields, factions, …)
- Arcane Enhancement digests (warframe/primary/secondary/melee/operator/amp/kitgun/zaw)
- Cached Overframe top builds with mods + arcanes (when crawled/imported)
- Curated DPS mod table (`dps` / `compare-dps`)

## Steps

1. Check pack: `npm run knowledge -- status`
2. Query anything local: `npm run knowledge -- lookup "<query>"`
   - Items: `Coda Hema`
   - Mechanics: `rad viral or corrosive magnetic`
   - Arcanes: `Arcane Energize` / `Primary Merciless`
3. For builds, honor markers:
   - `LOCAL_BUILDS_AVAILABLE` → compare local Overframe mods/arcanes
   - `ONLINE_SEARCH_CONFIRMATION_REQUIRED` → Online search toggle on = crawl; off = stay local (never ask yes/no)
4. Related CLIs:
   - Loadout vs top builds: `npm run knowledge -- compare-loadout "<item>" --mods "..." [--arcanes "..."]`
   - DPS: `npm run knowledge -- dps "<weapon>" --preset typical`
5. Refresh:
   - `npm run knowledge -- pull` (catalog + wiki + mechanics + arcanes + Overframe when reachable)
   - `npm run knowledge -- pull-mechanics`
   - `npm run knowledge -- pull-arcanes`
   - `npm run knowledge -- crawl-overframe` (top 3 builds + mods/arcanes; residential network recommended)
   - Optional knowledge sidecar: `./scripts/pack-knowledge-sidecar.sh`

## Notes

- The Hermes **profile** archive is lean; the knowledge bytes live in the repo checkout (or knowledge sidecar tarball).
- Cloudflare often blocks Overframe from datacenter IPs — crawl on a residential network or use `--import-builds` / Playwright export.
- Local LLM (Qwen etc.): always prefer these commands over memorized patch-sensitive numbers. See `LOCAL_LLM.md`.
