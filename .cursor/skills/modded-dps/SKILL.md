---
name: modded-dps
description: Estimate or compare offline modded DPS for Warframe weapons using the local calculator and curated mod presets.
---

# Modded DPS (offline)

## When to use

- Player asks which weapon hits harder or wants a damage estimate

## Steps

```bash
npm run knowledge -- dps "Coda Hema" --preset rifle-viral-heat
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
```

Web: `/dps …` or tool `estimate_modded_dps`.

Presets: `rifle-viral-heat`, `rifle-corrosive-heat`, `rifle-raw-crit`, `pistol-viral-heat`, `shotgun-viral-heat`, `typical`.

Say clearly: arsenal-style estimate, not a full TTK/DoT/riven/arcane simulator.
