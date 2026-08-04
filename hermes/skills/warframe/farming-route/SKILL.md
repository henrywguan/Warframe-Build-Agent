---
name: farming-route
description: Plan how to obtain Warframe items, resources, quests, and mission nodes using offline wiki digests and live world-state when needed.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Farming, Progression, Offline]
    category: warframe
---

# Farming route

## When to use

Operator asks where to farm a mod, resource, blueprint, relic, quest step, or prime part.

## Procedure

1. Lock target item, quantity, and whether Steel Path / Steel Essence context matters.
2. Ground acquisition in the offline pack first (`terminal.cwd` → repo root):
   - `npm run knowledge -- lookup "<item or resource>"`
   - `npm run knowledge -- lookup "Relic"` / faction drop mechanics when relevant
3. Prefer wiki digest facts (nodes, enemies, bounties, syndicates) over model memory.
4. For **live** timing (fissures, invasions, sortie, Baro, cycles), use `npm run wf -- fissures`, `invasions`, `sortie`, `cycles`.
5. Rank routes by efficiency vs accessibility: MR gate, quest lock, key cost, trade alternative.
6. Note drop chance caveats — RNG, rotation, squad boosters (Nekros, Khora).
7. If tradable, cross-check `npm run market -- price <slug>` vs farm time.
8. Do not invent drop locations.

## Output shape

- Target + quantity goal
- Best route(s) (fastest → accessible → budget)
- Node / source + rotation note
- Prerequisites (quest, MR, key)
- Squad / frame tips
- Trade alternative (if applicable)
- Next step
