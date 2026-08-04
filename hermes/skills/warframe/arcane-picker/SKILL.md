---
name: arcane-picker
description: Choose Warframe, primary, secondary, melee, and Magus arcanes for a role and content type using offline arcane digests.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Arcanes, Builds, Offline]
    category: warframe
---

# Arcane picker

## When to use

Operator asks which arcane to run on a frame or weapon, or how to pair two arcanes for SP/endgame.

## Procedure

1. Lock slot: Warframe, Primary, Secondary, Melee, or Magus.
2. Lock role: tank, DPS, support, ability spam, operator transfer.
3. Pull facts: `npm run knowledge -- lookup "Arcane …"`.
4. Check local Overframe builds — arcanes in `builds/by-item/<id>.json`.
5. Match arcane to content rhythm: Eidolon, SP survival, boss burst, open world.
6. Pair frame + weapon arcanes without redundant effects.
7. Call out rank cost and `npm run market -- price arcane_<slug>` when tradable.
8. Give budget alternatives (Exodia, Guardian, cheaper on-kill procs).
9. Note patch sensitivity.

## Output shape

- Slot + role
- Primary pick + why
- Secondary pick (if pairing two frame arcanes)
- Weapon arcane (if asked)
- Budget alternative
- Rank / cost note
- Market snapshot (if tradable)
- Next step
