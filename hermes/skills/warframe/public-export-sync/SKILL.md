---
name: public-export-sync
description: Refresh public game data and the local offline knowledge pack so lookups stay accurate.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Offline, Sync, Knowledge]
    category: warframe
---

# Public export sync

## When to use

Operator needs to refresh stale pack data, sync after a patch, or update catalog/wiki before advising.

## Procedure

1. Check pack: `npm run knowledge -- status` (manifest counts, Overframe status).
2. Safe refresh:
   ```bash
   npm run knowledge -- pull --skip-overframe
   npm run knowledge -- pull-mechanics
   npm run knowledge -- pull-arcanes
   ```
3. Full refresh when network allows: `npm run knowledge -- pull` + `crawl-overframe`.
4. Overframe blocked → browser export per `references/overframe-crawl.md` + `--import-builds`.
5. Market/patches (~4pm Pacific): `npm run market -- pull --force`, `npm run patches -- pull --force`.
6. In-game Public Export inventory → inventory-import skill; separate from catalog pull.
7. Re-run `status` and report deltas.

## Output shape

- Before/after counts
- Commands run
- Overframe status
- Stale areas remaining
- Next step
