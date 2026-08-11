---
name: damage-simulator
description: Choose between offline modded DPS estimates and full damage/DoT/attenuation explanations.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, DPS, Mechanics, Offline]
    category: warframe
---

# Damage simulator scope

## When to use

Operator asks DPS, TTK, DoT, armor scaling, or weapon compare — pick correct analysis depth.

## Procedure

1. Classify question:
   - **Simple:** A vs B preset, burst/sustained rank, `/dps`, SP elemental swap → modded-dps skill
   - **Deep:** slash DoT, attenuation, galvanized ramp, incarnon, riven min-max → mechanics digests + qualitative notes
2. Simple path:
   ```bash
   npm run knowledge -- dps "<weapon>" --preset typical
   npm run knowledge -- compare-dps "A" "B" --preset rifle-viral-heat
   npm run knowledge -- preset-list
   ```
   State arsenal-style estimate + preset `asOf`.
3. Deep path: `npm run knowledge -- lookup "Damage"` / `"Status Effect"` / `"Armor"` — no invented formulas.
4. Never claim full simulation when only CLI DPS ran; list omissions (rivens, arcanes, incarnon, stacks, slash ticks, TTK).
5. Missing calculator features → closest compare + mechanic explanation.
6. citation-check for patch-sensitive rankings.

## Output shape

- Question type (simple vs deep)
- Tool used
- Numbers + preset + asOf (if CLI)
- Mechanic notes when relevant
- Explicit limits
- Next step
