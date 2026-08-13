---
name: loadout-optimize
description: Assemble mission-specific loadout packages for Steel Path, Archon, Netracell, DA, Eidolons, Profit-taker, Arbitration, and Circuit.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Loadouts, SteelPath, Endgame]
    category: warframe
---

# Loadout optimize

## When to use

Operator wants a tuned full package for a specific mission type — not one item in isolation.

## Procedure

1. Lock mission: Steel Path, Archon Hunt, Netracell, Deep Archimedea, Eidolons, Profit-taker, Arbitration, or Duviri Circuit — plus solo/squad and budget.
2. Follow recommend-build source policy: local Overframe builds first; if missing, crawl online immediately (Hermes always online).
3. Ground slots from pack (`terminal.cwd` → repo root):
   - `npm run knowledge -- lookup "<frame/weapon>"`
   - `npm run knowledge -- builds "<item>"`
   - `npm run knowledge -- dps|compare-dps` for weapon roles
   - `npm run knowledge -- lookup "Arcane …"`
4. Assign roles: nuke, tank, buffer, CC, strip, helminth, operator.
5. Cover all slots + both arcanes; note arch-gun when relevant.
6. Match damage strategy to faction/mechanic.
7. Mission-specific mods (Galvanized, shards, PT phase tools, arbitration sustain).
8. Name build sources.

## Output shape

- Mission + modifier context
- Frame — role, mods, helminth, augments
- Primary / secondary / melee
- Companion + arcanes
- Operator / amp (when relevant)
- Play loop
- Budget swaps + next upgrade
