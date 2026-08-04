---
name: arcane-picker
description: Choose Warframe, primary, secondary, melee, and Magus arcanes for a role and content type using offline arcane digests.
---

# Arcane picker

## When to use

Player asks which arcane to run on a frame or weapon, or how to pair two arcanes for SP/endgame.

## Steps

1. Lock slot type: **Warframe**, **Primary**, **Secondary**, **Melee**, or **Magus** (operator).
2. Lock role: tank, DPS, support, ability spam, operator transfer, melee conditionals.
3. Pull facts from the offline pack:
   - `npm run knowledge -- lookup "Arcane Energize"` (or specific name)
   - `npm run knowledge -- pull-arcanes` if digests are stale (maintainer only)
4. Compare **local Overframe top builds** for the item — arcanes field in `builds/by-item/`.
5. Match arcane to **content rhythm**: Eidolon hunts, SP survival, boss burst, open-world mount.
6. Pair **frame + weapon** arcanes without redundant effects (e.g. double energy on kill).
7. Call out **rank cost** (225 vs 21) and market price via `npm run market -- price arcane_<slug>` when tradable.
8. Give **budget alternatives** (Exodia, cheaper on-kill procs, Guardian for early SP).
9. Note patch sensitivity — recheck after major updates.

## Output shape

- **Slot** + role
- **Primary pick** + why
- **Secondary pick** (if pairing two frame arcanes)
- **Weapon arcane** (if asked)
- **Budget alternative**
- **Rank / cost note**
- **Market snapshot** (if tradable)
- **Next step**
