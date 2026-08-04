---
name: modded-dps
description: Estimate or compare offline modded DPS for Warframe weapons using the local calculator and curated mod presets.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, DPS, Mods, Offline]
    category: warframe
---

# Modded DPS (offline)

## When to use

- Operator asks which weapon hits harder, wants a damage estimate, or “A vs B” under a shared mod plan
- Prefer this over inventing DPS numbers from model memory

Requires a Warframe-Build-Agent checkout (`terminal.cwd` → repo root) with `data/knowledge/` present.

## Steps

1. Check pack: `npm run knowledge -- status`
2. Single weapon:
   - `npm run knowledge -- dps "Coda Hema" --preset rifle-viral-heat`
3. Compare two weapons under the same mods/preset:
   - `npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical`
4. Explicit mods (comma-separated max-rank names):
   - `npm run knowledge -- dps "Torid" --mods "Serration,Split Chamber,Vital Sense,Hunter Munitions,Rime Rounds,Malignant Force,Primed Bane of Grineer,Vigilante Supplies"`

## Presets

`rifle-viral-heat`, `rifle-corrosive-heat`, `rifle-raw-crit`, `pistol-viral-heat`, `shotgun-viral-heat`, `typical`

## Scope / honesty

- Arsenal-style **burst + sustained DPS** estimate from catalog stats + curated mod multipliers
- Not a full simulator: no slash DoT ticks, full armor TTK, rivens, most arcanes, incarnon transforms, or galvanized stacks
- Say so briefly when presenting numbers

## Output shape

- Pick / ranking (for compares)
- Burst + sustained DPS figures from the CLI
- Caveats (offline estimate)
- One next-step (farm mods, try alternate elemental, crawl Overframe builds)
