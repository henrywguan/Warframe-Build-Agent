---
name: budget-upgrade-path
description: Chart a midgame-to-Steel Path upgrade path with mod priorities, forma spend, and affordable substitutions.
---

# Budget upgrade path

## When to use

Player is midgame and wants a staged plan toward Steel Path without buying every primed mod at once.

## Steps

1. Lock current stage: star chart cleared? MR? owned primed/galvanized? SP unlocked?
2. Follow [`docs/source-policy.md`](../../../docs/source-policy.md): offline pack first (`npm run knowledge -- lookup "<frame/weapon>"`).
3. Identify **one primary goal** (frame, weapon, companion, arcanes) — avoid sprawling shopping lists.
4. Split upgrades into **tiers**:
   - Tier 0: free / quest / market under 50p
   - Tier 1: core DPS + survivability (Serration, Vitality, Hunter mods, basic elemental)
   - Tier 2: SP staples (Galvanized, key primed, forma on aura/exilus)
   - Tier 3: premium (Arcane Energize, Primed Bane, rivens)
5. For weapons, run `npm run knowledge -- compare-dps` when choosing between affordable options.
6. Call out **one-time costs** (Forma, Orokin Catalyst/Reactor, helminth, arcanes) vs **repeat farms**.
7. Give **substitutions** for each expensive slot (e.g. Point Strike → Vital Sense path).
8. End with the next 1–2 farms or trades, not a full endgame spreadsheet.

## Output shape

- **Goal** + content (SP, sorties, open world)
- **Current gaps** (survival vs damage vs utility)
- **Tiered upgrade list** (now → next month)
- **Budget substitutions** per tier
- **Forma / catalyst notes**
- **Skip list** (low ROI for their goal)
- **Next farm / purchase**
