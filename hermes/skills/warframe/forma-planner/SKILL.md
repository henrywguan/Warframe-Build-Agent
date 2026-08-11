---
name: forma-planner
description: Estimate Forma and polarity costs for Warframe, weapon, and companion builds.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Forma, Builds, Mods]
    category: warframe
---

# Forma planner

## When to use

Operator asks Forma count, polarity priority, or minimizing Forma on a budget build.

## Procedure

1. Lock item(s) + target mod list (pasted, Overframe, or recommended).
2. `npm run knowledge -- lookup "Forma"`.
3. Community forma counts: `npm run knowledge -- builds "<item>"` (`forma` on ranked builds).
4. Pasted loadout: `npm run knowledge -- compare-loadout "<item>" --mods "…"`.
5. Count polarity mismatches; prioritize aura/stance/exilus, umbral/primed, flex last.
6. Forma range (min/typical/max) when mods uncertain.
7. Budget mod swaps to save Forma.

## Output shape

- Item + build source
- Estimated Forma (min/typical/max)
- Polarize-first slots
- Mod swaps
- Reactor/catalyst note
- Next step
