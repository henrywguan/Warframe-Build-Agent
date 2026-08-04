---
name: budget-upgrade-path
description: Chart a midgame-to-Steel Path upgrade path with mod priorities, forma spend, and affordable substitutions.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Builds, Progression, Budget]
    category: warframe
---

# Budget upgrade path

## When to use

Operator is midgame and wants a staged plan toward Steel Path without buying every primed mod at once.

## Procedure

1. Lock stage: star chart, MR, owned primed/galvanized, SP unlocked.
2. Follow source policy (`references/source-policy.md`): offline pack first — `npm run knowledge -- lookup "<item>"`.
3. Pick **one primary goal** (frame, weapon, companion, arcanes).
4. Tier upgrades:
   - Tier 0: free / quest / cheap market
   - Tier 1: core DPS + survivability mods
   - Tier 2: SP staples (Galvanized, key primed, forma)
   - Tier 3: premium (Arcane Energize, Primed Bane, rivens)
5. Use `npm run knowledge -- compare-dps` when choosing between affordable weapons.
6. Call out one-time costs (Forma, catalyst/reactor, helminth) vs repeat farms.
7. Give substitutions for each expensive slot.
8. End with next 1–2 farms or trades only.

## Output shape

- Goal + content (SP, sorties, open world)
- Current gaps (survival vs damage vs utility)
- Tiered upgrade list
- Budget substitutions per tier
- Forma / catalyst notes
- Skip list (low ROI)
- Next farm / purchase
