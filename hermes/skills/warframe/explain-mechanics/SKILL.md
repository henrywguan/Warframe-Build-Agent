---
name: explain-mechanics
description: Explain Warframe mechanics such as damage types, status, crit, armor, shields, overguard, and scaling using local digests first.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Mechanics, Offline]
    category: warframe
---

# Explain mechanics

## When to use

Player asks how something works, why a setup scales, or what a status/crit/elemental interaction means.

## Procedure

1. **Lookup local digests first** (do not invent from memory):
   - `npm run knowledge -- lookup "viral"`
   - `npm run knowledge -- lookup "rad viral or corrosive magnetic"`
   - `npm run knowledge -- lookup "armor"` / `status effect` / faction names as needed
2. Answer in plain language (2–4 sentences) grounded in that extract.
3. Connect it to the player's gear or goal when known.
4. Cover practical numbers players need; skip unused formulas.
5. Call out common misconceptions.
6. If live faction/mission context matters, use the world-state skill.
7. For DPS implications of a mod plan, hand off to `modded-dps`.

## Output shape

- Short answer
- How it plays in practice
- What to build for
- Watch-outs
- Optional next step
