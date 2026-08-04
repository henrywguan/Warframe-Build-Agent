---
name: preset-curator
description: Maintain curated DPS mod presets in data/knowledge/dps/common-mods.json with accurate asOf metadata.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, DPS, Maintainer, Offline]
    category: warframe
    related_skills: [modded-dps]
---

# Preset curator

## When to use

Maintainer updates mod presets after patches, new Galvanized mods, or when DPS results drift from meta.

Requires repo checkout with `data/knowledge/dps/common-mods.json`.

## Procedure

1. Open `data/knowledge/dps/common-mods.json` — check `asOf` and preset keys.
2. Cross-check meta against local Overframe builds (`builds/by-item/`) and SP staples.
3. Update mod entries used by `src/knowledge/dps/mods.ts`.
4. Adjust presets — keep CLI/web preset names stable.
5. Prefer Galvanized shells for SP; keep `rifle-budget` for accessible compares.
6. Bump `asOf` to edit date (ISO `YYYY-MM-DD`).
7. Verify:
   - `npm run knowledge -- dps "Ignis Wraith" --preset typical`
   - `npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical`
8. Run `./scripts/cleanup-verify.sh` after code-touching edits.

## Output shape

- asOf date updated
- Presets touched + rationale
- Mods added/removed
- Sample CLI output
- Verification (pass/fail)
