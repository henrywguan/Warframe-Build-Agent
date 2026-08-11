---
name: public-export-sync
description: Refresh public game data and the local offline knowledge pack so lookups stay accurate.
---

# Public export sync

## When to use

Player or operator needs to refresh stale pack data, sync after a patch, or update catalog/wiki/mechanics before advising.

## Steps

1. Check current pack health:
   - `npm run knowledge -- status`
   - Note `manifest.json` counts (catalog, wiki, mechanics, arcanes, Overframe status)
2. **Safe refresh** (no Overframe crawl required):
   ```bash
   npm run knowledge -- pull --skip-overframe
   npm run knowledge -- pull-mechanics
   npm run knowledge -- pull-arcanes
   ```
3. **Full refresh** when home network allows:
   - `npm run knowledge -- pull` (catalog + wiki + Overframe attempt)
   - `npm run knowledge -- crawl-overframe` if not Cloudflare-blocked
4. **Overframe blocked?** Use browser export per [`docs/overframe-crawl.md`](../../../docs/overframe-crawl.md):
   - `npm run knowledge:export-overframe -- --limit 5`
   - `npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json`
5. **Market / patches** (separate daily cadence ~4pm Pacific):
   - `npm run market -- pull --force`
   - `npm run patches -- pull --force`
6. For **in-game Public Export** inventory files: keep separate from pack pull — use **inventory-import** skill to parse; catalog sync does not replace personal ownership data.
7. Re-run `npm run knowledge -- status` and report what changed.

## Output shape

- **Before / after** manifest counts
- **Commands run** (pull, mechanics, arcanes, Overframe import)
- **Overframe status** (full / partial / import path used)
- **Stale areas remaining** (if any)
- **Next step** (test lookup, import builds, schedule daily market/patches)
