---
name: steel-path-loadout
description: Assemble a full Steel Path loadout package — frame, weapons, companion, operator, and arcanes — grounded in the offline pack.
---

# Steel Path loadout

## When to use

Player wants a complete SP-ready package for a mission type (survival, capture, boss, railjack, open world).

## Steps

1. Lock mission type, faction, solo vs squad, and budget (min-max vs accessible).
2. Follow [`docs/source-policy.md`](../../../docs/source-policy.md): local Overframe builds first; Online search toggle for live crawl if missing (never ask yes/no).
3. Ground each slot from the pack:
   - Frame: `npm run knowledge -- lookup "<Warframe>"`
   - Weapons: `compare-dps` or `dps` for primary/secondary/melee roles
   - Arcanes: `npm run knowledge -- lookup "Arcane …"`
4. Assign **roles**: nuke, tank, buffer, crowd control, armor strip, helminth subsumes.
5. Cover all eight slots: frame abilities + augments, primary, secondary, melee, companion, operator/Focus, arch-gun if relevant, **both arcanes**.
6. State **damage strategy** vs SP armor/shields (viral+heat, corrosive, slash, shield strip).
7. List **mod priorities** per item; flex for faction or mission (e.g. duration vs range).
8. Note SP-specific mods (Galvanized, Steel Charge, Umbral when worth it).
9. Name build sources (Overframe cache / agent-calculated).

## Output shape

- **Mission / faction**
- **Frame** — role, core mods, helminth, augments
- **Primary / secondary / melee** — role + core mods each
- **Companion** — primer or utility
- **Arcanes** (frame + weapon)
- **Operator / Focus** (if relevant)
- **Play loop** (1–3 lines)
- **Budget swaps**
- **Next upgrade**
