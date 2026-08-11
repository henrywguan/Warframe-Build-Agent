---
name: loadout-optimize
description: Assemble mission-specific loadout packages for Steel Path, Archon, Netracell, DA, Eidolons, Profit-taker, Arbitration, and Circuit.
---

# Loadout optimize

## When to use

Player wants a tuned **full package** for a specific mission type — not just one weapon or frame in isolation.

## Steps

1. Lock **mission type** and constraints:

   | Mission | Key needs |
   | --- | --- |
   | **Steel Path** | armor/shield scaling, galvanized mods, survivability |
   | **Archon Hunt** | boss weakpoints, shard-aware frame, elemental match |
   | **Netracell** | mobility, nullifier/Eximus handling, sustained DPS |
   | **Deep Archimedea (DA)** | varied modifiers, generalist kit, recovery tools |
   | **Eidolons** | Operator/amp, lures, void damage, buff windows |
   | **Profit-taker** | phase mechanics, operator/macro, shield strip |
   | **Arbitration** | rot-long survival, perma buff/DR, revive risk |
   | **Duviri Circuit** | incarnon familiarity, balanced roles |

2. Follow [`docs/source-policy.md`](../../../docs/source-policy.md): local Overframe builds first; ask yes/no before online search if missing.
3. Ground each slot from the pack:
   - `npm run knowledge -- lookup "<Warframe / weapon>"`
   - `npm run knowledge -- builds "<item>"` for cached community setups
   - `npm run knowledge -- dps|compare-dps` for weapon role checks
   - `npm run knowledge -- lookup "Arcane …"` for arcanes
4. Assign **roles**: nuke, tank, buffer, CC, strip, helminth, operator.
5. Cover slots: frame + augments, primary, secondary, melee, companion, operator/Focus, arch-gun if relevant, **both arcanes**.
6. Match **damage strategy** to faction/mechanic (viral+heat, corrosive, magnetic, void, rad).
7. Note mission-specific mods (Galvanized, Archon Shards, Hunter/Amalgam, PT phase tools).
8. Name build sources (Overframe cache / agent-calculated).

## Output shape

- **Mission + modifier context**
- **Frame** — role, core mods, helminth, augments
- **Primary / secondary / melee** — role + core mods each
- **Companion** — primer or utility
- **Arcanes** (frame + weapon)
- **Operator / amp** (Eidolon/PT/SP when relevant)
- **Play loop** (1–3 lines)
- **Budget swaps**
- **Next upgrade**
