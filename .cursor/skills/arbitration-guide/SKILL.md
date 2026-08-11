---
name: arbitration-guide
description: Interpret live Arbitration missions and recommend loadout tips for rotation-long survival and rewards.
---

# Arbitration guide

## When to use

Player asks about today's Arbitration, what it rewards, how hard it is, or what frame/loadout fits the mission.

## Steps

1. Pull **live** Arbitration from worldstate:
   - `npm run wf -- get arbitration`
   - `npm run wf -- summary` for expiry / platform context
2. Parse mission type (survival, defense, excavation, etc.), faction, and **rotations** (longer than normal).
3. Ground faction mechanics and mod priorities in the offline pack:
   - `npm run knowledge -- lookup "<faction>"` / `"Steel Path"` / `"Galvanized"`
4. Recommend loadout pillars for Arbitration:
   - **Sustain** — health/shield/energy recovery, gating, DR
   - **Revive safety** — self-revive, tankiness, or squad role clarity
   - **Scaling DPS** — galvanized stacks, armor strip, crowd control
5. Note **reward context**: Vitus Essence, Arbitration rotation mods (e.g. Galvanized), Steel Path currency when relevant.
6. Cross-check [`loadout-optimize`](../../loadout-optimize/SKILL.md) for mission-specific packages; keep Arbitration tips concise.
7. Do not invent mission node or reward tables.

## Output shape

- **Today's Arbitration** (type, faction, node, time left)
- **Difficulty notes** (scaling, modifier quirks)
- **Recommended frame roles** (1–3 options)
- **Core mod / arcane priorities**
- **Squad tips** (revive, buff sharing, loot)
- **Reward focus** (what to farm this week)
- **Next step** (queue, check loadout, run `get arbitration` again)
