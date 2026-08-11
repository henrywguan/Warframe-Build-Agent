---
name: necramech-loadout
description: Recommend Necramech mod builds for open world, Steel Path, and Eidolon support roles.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Necramech, Loadouts, OpenWorld]
    category: warframe
---

# Necramech loadout

## When to use

Operator asks Necramech build, mods, or mission fit (Bonewidow, Voidrig, Lavos).

## Procedure

1. Lock mech, role (tank/DPS/support), content (open world, SP, Eidolons).
2. Offline pack:
   - `npm run knowledge -- lookup "<Necramech>"`
   - `npm run knowledge -- lookup "Necramech"` / `"Archgun"`
3. Source policy: `npm run knowledge -- builds "<Necramech>"` when cached.
4. Mod categories: ability stats, armor/health, exalted weapon, companion link.
5. Ability loop per archetype.
6. Archgun DPS check: `npm run knowledge -- dps "<archgun>"` when relevant.
7. Name build source.

## Output shape

- Mech + role + content
- Core mod priorities
- Arcane / exalted note
- Ability loop
- Warframe/operator synergy
- Budget swaps
- Next step
