---
name: riven-advisor
description: Advise whether to roll, keep, or sell a Riven mod and suggest preferred stats for a weapon archetype.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Rivens, Mods, Trading]
    category: warframe
---

# Riven advisor

## When to use

Operator asks if a riven is worth keeping, what stats to roll for, or whether to buy/unveil for a weapon.

## Procedure

1. Lock weapon, riven disposition, and goal (SP DPS, status, crit, comfort).
2. Ground base stats: `npm run knowledge -- lookup "<weapon>"`.
3. Classify archetype: crit/status hybrid, pure status beam, heavy crit melee, etc.
4. Recommend priority stats for that archetype.
5. Flag acceptable negatives (recoil on beam) vs harmful (damage, multishot).
6. Compare riven value to mod slot cost — good riven vs primed slot.
7. For trade questions: `npm run market -- price <slug>` — caveat high variance.
8. Offline DPS calc does **not** simulate rivens — qualitative tiers only.
9. Suggest when not to roll (low disposition, cheap meta alternative).

## Output shape

- Weapon + disposition note
- Keep / reroll / sell verdict
- Ideal stat priority (ordered)
- Acceptable negatives
- Current roll grade (if stats provided)
- Kuva / trade caveat
- Next step
