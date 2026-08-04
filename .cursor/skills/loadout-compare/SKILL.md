---
name: loadout-compare
description: Compare a pasted Warframe/weapon loadout (mods + arcanes) against top local Overframe builds in the offline pack.
---

# Loadout compare (offline)

## When to use

- Player pastes mods/arcanes or attaches a screenshot (web) and wants closeness to popular builds

## Steps

1. `npm run knowledge -- status` (confirm build entries when possible)
2. CLI:
   ```bash
   npm run knowledge -- compare-loadout "Coda Hema" \
     --mods "Serration,Split Chamber,Vital Sense" \
     --arcanes "Primary Merciless"
   ```
3. Web: Attach screenshot or `/compare <item> | mods…` / tool `compare_loadout_to_overframe`
4. Honor `LOCAL_BUILDS_AVAILABLE` vs `ONLINE_SEARCH_CONFIRMATION_REQUIRED`
