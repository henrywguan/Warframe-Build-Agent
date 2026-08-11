---
name: necramech-loadout
description: Recommend Necramech mod builds for open world, Steel Path, and Eidolon support roles.
---

# Necramech loadout

## When to use

Player asks how to build a Necramech (Bonewidow, Voidrig, Lavos), which mods/arcanes to use, or how it fits a mission.

## Steps

1. Lock **mech**, role (tank, DPS, support), and content (Plains/Orb/Cambion, SP, Eidolon backup).
2. Ground stats and mod facts in the offline pack:
   - `npm run knowledge -- lookup "<Necramech name>"`
   - `npm run knowledge -- lookup "Necramech"` / `"Archgun"` when relevant
3. Follow [`docs/source-policy.md`](../../../docs/source-policy.md) for community builds:
   - `npm run knowledge -- builds "<Necramech>"` when cached
4. Cover **mod categories**: strength/efficiency/range on exalted, armor/health, weapon exalted mods, companion link if applicable.
5. Note **ability loop** (shield tank, immobilize, artillery) per mech archetype.
6. Cross-check weapon DPS if mech gun matters: `npm run knowledge -- dps "<archgun>"`.
7. Name build source (Overframe cache / agent-calculated).

## Output shape

- **Mech + role + content**
- **Core mod priorities** (ability vs survivability vs gun)
- **Arcane / exalted weapon note** (if applicable)
- **Ability loop** (1–3 lines)
- **Synergy** with Warframe/operator
- **Budget substitutions**
- **Next step** (farm mods, rank archgun, import builds)
