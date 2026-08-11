---
name: citation-check
description: Enforce source freshness, conflict language, and patch-sensitive labels on Warframe advice.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Policy, Citations, Offline]
    category: warframe
---

# Citation check

## When to use

Before finalizing build, compare, farm, market, or mechanics answers — especially when sources may disagree.

## Procedure

1. Follow `references/source-policy.md` and source-hygiene skill.
2. Tag evidence per claim:
   - Pack → `npm run knowledge -- lookup` / `status`
   - DPS → `dps|compare-dps` (preset `asOf`)
   - Worldstate → `npm run wf -- …`
   - Market → `npm run market -- price` (4pm Pacific snapshots)
   - Patches → `npm run patches -- latest|changes`
3. Freshness labels: `patch-sensitive`, `market-volatile`, `live-timer`, `pack-stale`.
4. Conflicts → patch timing, assumptions, API timing, market, partial Overframe crawl.
5. No invented URLs/rates; use consent markers from source policy.
6. Named source line on every substantive answer.

## Output shape

- Sources used + caveats
- Freshness tags
- Conflicts + likely cause
- Sanitized answer
- Refresh suggestion
