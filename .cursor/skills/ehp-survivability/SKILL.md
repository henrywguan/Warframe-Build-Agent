---
name: ehp-survivability
description: Advise on Warframe effective HP, damage reduction, gating, and survivability mod priorities.
---

# EHP & survivability

## When to use

Player asks how tanky a frame is, how to survive Steel Path / arbitration / high level, or which defensive mods and arcanes to prioritize.

## Steps

1. Lock **frame**, content level (SP, arbitration, casual), and failure mode (one-shots, energy drought, status procs).
2. Ground defensive mechanics in the offline pack:
   - `npm run knowledge -- lookup "Armor"` / `"Shields"` / `"Health"`
   - `npm run knowledge -- lookup "<Warframe>"`
   - `npm run knowledge -- lookup "Damage Reduction"` / `"Archon Shard"` when relevant
3. Explain **EHP concept** from digests: shields vs armor vs health scaling; avoid inventing exact values without data.
4. When an **EHP calculator** is available in the repo or web tools, use it for numeric comparisons; otherwise give **qualitative** ranking (gating > DR > raw EHP > recovery).
5. Cover **gating** patterns: invulnerability windows, damage immunity phases, shield gate, Rolling Guard, Adaptation stacks — only when frame supports them.
6. List **mod / arcane priorities**: Umbral trio, Gladiator, Adaptation, Rolling Guard, Augur/Guardian, Molt Augment, etc. — matched to frame kit.
7. Note **Helminth** subsume options for survival (see helminth-picker skill).
8. Do not invent frame base stats; use catalog + wiki digest.

## Output shape

- **Frame + content**
- **Survivability tier** (qualitative or calculator-backed EHP)
- **Gating / DR tools** available on this frame
- **Core defensive mods + arcanes**
- **Helminth / ability tips**
- **Common failure modes + fixes**
- **Next step** (farm mod, add shard, test arbitration)
