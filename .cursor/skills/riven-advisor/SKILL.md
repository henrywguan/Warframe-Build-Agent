---
name: riven-advisor
description: Advise whether to roll, keep, or sell a Riven mod and suggest preferred stats for a weapon archetype.
---

# Riven advisor

## When to use

Player asks if a riven is worth keeping, what stats to roll for, or whether to buy/unveil for a weapon.

## Steps

1. Lock weapon name, riven disposition, and goal (SP DPS, status, crit, comfort).
2. Ground base weapon stats from the offline pack: `npm run knowledge -- lookup "<weapon>"`.
3. Classify weapon archetype: crit/status hybrid, pure status beam, heavy crit melee, etc.
4. Recommend **priority stats** for that archetype (e.g. +multishot +crit +damage for crit rifles).
5. Flag **negative stats** that are usually acceptable (recoil on beam, zoom on shotgun) vs harmful (damage, multishot).
6. Compare riven value to **mod slot cost** — is a good riven better than a primed slot?
7. For trade questions, check `npm run market -- price <riven_slug>` if listed; caveat high variance.
8. Be honest: offline DPS calc does **not** simulate rivens — give qualitative tiers, not fake numbers.
9. Suggest when **not** to roll (low disposition, cheap meta alternative, kuva cost).

## Output shape

- **Weapon** + disposition note
- **Keep / reroll / sell** verdict
- **Ideal stat priority** (ordered)
- **Acceptable negatives**
- **Current roll grade** (if stats provided)
- **Kuva / trade caveat**
- **Next step**
