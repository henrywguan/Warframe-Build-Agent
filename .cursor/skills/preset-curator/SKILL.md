---
name: preset-curator
description: Maintain curated DPS mod presets in data/knowledge/dps/common-mods.json with accurate asOf metadata.
---

# Preset curator

## When to use

Maintainer updates mod presets after patches, new Galvanized mods, or when `dps` / `compare-dps` results drift from community meta.

## Steps

1. Open `data/knowledge/dps/common-mods.json` — check `asOf` date and preset keys.
2. Cross-check meta against local Overframe top builds (`builds/by-item/`) and SP staples — not memory alone.
3. Update **mod entries**: name, rank, multiplier fields used by `src/knowledge/dps/mods.ts`.
4. Adjust **presets** (`rifle-viral-heat`, `typical`, etc.) — keep names stable for CLI/web contracts.
5. Prefer **Galvanized** shells for SP presets; keep `rifle-budget` for accessible comparisons.
6. Bump `asOf` to the edit date (ISO `YYYY-MM-DD`).
7. Verify:
   - `npm run knowledge -- dps "Ignis Wraith" --preset typical`
   - `npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical`
8. Run `./scripts/cleanup-verify.sh` after code-touching edits.
9. Document breaking preset renames in commit message — do not rename lightly.

## Output shape

- **asOf** date updated
- **Presets touched** + rationale
- **Mods added/removed**
- **Sample CLI output** (one compare)
- **Verification** (cleanup-verify pass/fail)
