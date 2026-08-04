---
name: faction-counter
description: Recommend damage types, status priorities, and mod choices against Grineer, Corpus, Infested, and Sentient factions.
---

# Faction counter

## When to use

Player asks what element to run, which bane mod matters, or how to strip armor/shields for a faction.

## Steps

1. Lock faction(s) and content (SP, sortie, arbitration, open world).
2. Ground mechanics in the offline pack:
   - `npm run knowledge -- lookup "Damage"` / `"Status Effect"` / `"Armor"` / `"Shield"`
   - `npm run knowledge -- lookup "<faction>"` when a digest exists
3. Map faction weaknesses:
   - **Grineer** — armor → corrosive / viral+heat; slash for bleed; Bane of Grineer
   - **Corpus** — shields → magnetic / toxin+magnetic; shield-gating awareness
   - **Infested** — flesh → viral+heat or pure heat; toxin for ancients
   - **Sentient** — adaptivity → multi-element / operator / amp; status mix
4. Separate **weapon element** from **frame ability** damage (ability strength vs weapon mods).
5. Recommend **status vs crit** bias when it changes the answer (e.g. Hunter Munitions vs raw crit).
6. Mention **armor strip** frames/companions (Specter, Shattering Impact, Dispensary, etc.) when SP scaling matters.
7. If comparing weapons for a faction, use `npm run knowledge -- compare-dps` with an appropriate preset.

## Output shape

- **Faction** + mission note
- **Recommended elements** (primary + secondary combo)
- **Key mods** (Bane, elemental, strip tools)
- **Status vs crit** lean
- **Frame / companion synergies**
- **Avoid** (anti-patterns for this faction)
- **Next step** (mod farm or element swap)
