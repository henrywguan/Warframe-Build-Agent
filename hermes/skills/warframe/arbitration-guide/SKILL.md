---
name: arbitration-guide
description: Interpret live Arbitration missions and recommend loadout tips for rotation-long survival and rewards.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Arbitration, WorldState, Loadouts]
    category: warframe
---

# Arbitration guide

## When to use

Operator asks about today's Arbitration, rewards, difficulty, or loadout fit.

## Procedure

1. Live worldstate:
   - `npm run wf -- get arbitration`
   - `npm run wf -- summary`
2. Parse mission type, faction, rotations (longer than normal).
3. Offline pack for faction/mod context:
   - `npm run knowledge -- lookup "<faction>"` / `"Galvanized"`
4. Loadout pillars: sustain, revive safety, scaling DPS (strip/CC/galvanized).
5. Reward context: Vitus Essence, rotation mods, Steel Essence when relevant.
6. See loadout-optimize skill for full packages; keep Arbitration tips concise.
7. Do not invent nodes or rewards.

## Output shape

- Today's Arbitration (type, faction, node, time left)
- Difficulty notes
- Frame role recommendations
- Mod/arcane priorities
- Squad tips
- Reward focus
- Next step
