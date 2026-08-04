---
name: faction-counter
description: Recommend damage types, status priorities, and mod choices against Grineer, Corpus, Infested, and Sentient factions.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Damage, Factions, Mechanics]
    category: warframe
---

# Faction counter

## When to use

Operator asks what element to run, which bane mod matters, or how to strip armor/shields for a faction.

## Procedure

1. Lock faction(s) and content (SP, sortie, arbitration, open world).
2. Ground mechanics in the offline pack:
   - `npm run knowledge -- lookup "Damage"` / `"Status Effect"` / `"Armor"`
   - Faction-specific digests when available
3. Map weaknesses:
   - Grineer — armor → corrosive / viral+heat; Bane of Grineer
   - Corpus — shields → magnetic / toxin+magnetic
   - Infested — viral+heat or heat; toxin for ancients
   - Sentient — adaptivity → multi-element / operator
4. Separate weapon element from ability damage.
5. Recommend status vs crit bias when it changes the answer.
6. Mention armor strip tools when SP scaling matters.
7. Use `compare-dps` with an appropriate preset when comparing weapons.

## Output shape

- Faction + mission note
- Recommended elements
- Key mods (Bane, elemental, strip)
- Status vs crit lean
- Frame / companion synergies
- Avoid (anti-patterns)
- Next step
