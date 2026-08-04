---
name: farming-route
description: Plan how to obtain Warframe items, resources, quests, and mission nodes using offline wiki digests and live world-state when needed.
---

# Farming route

## When to use

Player asks where to farm a mod, resource, blueprint, relic, quest step, or prime part.

## Steps

1. Lock the target: item name, quantity, and whether they need **Steel Path** / **Steel Essence** context.
2. Ground drop tables and acquisition in the offline pack first:
   - `npm run knowledge -- lookup "<item or resource>"`
   - `npm run knowledge -- lookup "Forma"` / `"Relic"` / faction drop mechanics when relevant
3. Prefer wiki digest facts (nodes, enemies, bounties, syndicates, open-world cycles) over memory.
4. For **live** nodes (fissures, invasions, sortie rewards, Baro, Nightwave), use `npm run wf -- fissures`, `invasions`, `sortie`, `cycles` only when timing matters.
5. Rank routes by **efficiency vs accessibility**: MR gate, quest lock, key/dojo cost, and whether a trade is cheaper.
6. Note **drop chance caveats** — RNG, rotation timing, and squad composition (e.g. Nekros, Hydroid, Khora).
7. If the item is tradable, mention `npm run market -- price <slug>` as an alternative to farming.
8. Do not invent drop locations; cite pack digest or official wiki paths only.

## Output shape

- **Target** + quantity goal
- **Best route(s)** (ordered: fastest → accessible → budget)
- **Node / source** + rotation or cycle note
- **Prerequisites** (quest, MR, key, syndicate)
- **Squad / frame tips** (1–2 lines)
- **Trade alternative** (if applicable)
- **Next step** (start node, check fissures, or buy)
