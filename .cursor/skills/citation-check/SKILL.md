---
name: citation-check
description: Enforce source freshness, conflict language, and patch-sensitive labels on Warframe advice.
---

# Citation check

## When to use

Before finalizing any build, compare, farm, market, or mechanics answer — especially when sources may disagree or data is time-sensitive.

## Steps

1. Read [`docs/source-policy.md`](../../../docs/source-policy.md) and apply **source-hygiene** rules.
2. For each factual claim, tag **evidence**:
   - Offline pack → `npm run knowledge -- lookup` / `status`
   - DPS numbers → `npm run knowledge -- dps|compare-dps` (note preset `asOf`)
   - Live worldstate → `npm run wf -- …` + fetch time
   - Market → `npm run market -- price` (volatile; daily snapshot ~4pm Pacific)
   - Patches → `npm run patches -- latest|changes`
3. Apply **freshness labels** when relevant:
   - `patch-sensitive` — rankings/mod values may change after hotfix
   - `market-volatile` — plat prices shift daily
   - `live-timer` — fissures, events, arbitration expire
   - `pack-stale` — suggest `npm run knowledge -- pull` when manifest counts look old
4. When sources **conflict**, state likely reasons: patch timing, build assumptions, API timing, market fluctuation, Overframe crawl partial.
5. Never invent URLs, drop rates, or video links; use consent markers from source policy (`LOCAL_BUILDS_AVAILABLE`, `ONLINE_SEARCH_CONFIRMATION_REQUIRED`).
6. End with **named source line** in every substantive answer.

## Output shape

- **Sources used** (tool + timestamp/caveat)
- **Freshness tags** (patch-sensitive / market-volatile / live-timer / pack-stale)
- **Conflicts** (if any) + likely cause
- **Sanitized answer** (claims tied to evidence)
- **Refresh suggestion** (pull pack, market pull, patches check)
