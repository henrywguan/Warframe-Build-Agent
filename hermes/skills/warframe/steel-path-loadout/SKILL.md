---
name: steel-path-loadout
description: Assemble a full Steel Path loadout package — frame, weapons, companion, operator, and arcanes — grounded in the offline pack.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Steel Path, Builds, Loadout]
    category: warframe
---

# Steel Path loadout

## When to use

Operator wants a complete SP-ready package for survival, capture, boss, railjack, or open world.

## Procedure

1. Lock mission type, faction, solo vs squad, budget (min-max vs accessible).
2. Follow source policy: local Overframe builds first; Online opt-in for live crawl if missing (never ask yes/no).
3. Ground each slot from the pack:
   - Frame: `npm run knowledge -- lookup "<Warframe>"`
   - Weapons: `dps` / `compare-dps`
   - Arcanes: `npm run knowledge -- lookup "Arcane …"`
4. Assign roles: nuke, tank, buffer, CC, armor strip, helminth.
5. Cover all slots: frame, primary, secondary, melee, companion, operator/Focus, arch-gun if relevant, both arcanes.
6. State damage strategy vs SP armor/shields.
7. List mod priorities per item; note Galvanized and Umbral when worth it.
8. Name build sources (local Overframe cache / agent-calculated).

## Output shape

- Mission / faction
- Frame — role, core mods, helminth, augments
- Primary / secondary / melee — role + core mods
- Companion — primer or utility
- Arcanes (frame + weapon)
- Operator / Focus (if relevant)
- Play loop
- Budget swaps
- Next upgrade
