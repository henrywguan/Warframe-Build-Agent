---
name: ehp-survivability
description: Advise on Warframe effective HP, damage reduction, gating, and survivability mod priorities.
version: 0.4.0
metadata:
  hermes:
    tags: [Warframe, Survivability, EHP, Mods]
    category: warframe
---

# EHP & survivability

## When to use

Operator asks tankiness, SP/arbitration survival, or defensive mod/arcane priorities.

## Procedure

1. Lock frame, content level, failure mode (one-shots, energy, procs).
2. Offline pack:
   - `npm run knowledge -- lookup "Armor"` / `"Shields"` / `"Health"`
   - `npm run knowledge -- lookup "<Warframe>"`
   - `npm run knowledge -- lookup "Damage Reduction"` / `"Archon Shard"`
3. Explain EHP from digests; no invented values without data.
4. Prefer the offline calculator (same as webchat `/ehp`):
   - `npm run knowledge -- ehp --health N --shields N --armor N [--dr 0.75] [--overguard N] [--adaptation 0-10]`
   - Else qualitative ranking (gating > DR > EHP > recovery).
5. Gating patterns only when frame supports them.
6. Mod/arcane priorities matched to kit; helminth options when relevant.
7. Stats from catalog + wiki digest only.

## Output shape

- Frame + content
- Survivability tier (qualitative or calculator EHP)
- Gating / DR tools
- Core mods + arcanes
- Helminth / ability tips
- Failure modes + fixes
- Next step
