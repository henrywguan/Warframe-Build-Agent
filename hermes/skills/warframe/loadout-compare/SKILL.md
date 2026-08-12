---
name: loadout-compare
description: Compare a pasted Warframe/weapon loadout (mods + arcanes) against top local Overframe builds in the offline pack.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Builds, Overframe, Offline, Loadout]
    category: warframe
---

# Loadout compare (offline)

## When to use

- Operator pastes their current mods/arcanes and wants closeness to popular builds
- Operator asks “how does my Coda Hema look vs Overframe?”
- Screenshot OCR is unavailable in Hermes — ask them to paste names instead (or use the web UI Attach flow)

Requires a Warframe-Build-Agent checkout with Overframe builds crawled/imported into `data/knowledge/builds/`.

## Steps

1. Check pack: `npm run knowledge -- status` (confirm `buildEntries` > 0 for useful compares)
2. Collect: item name, mod list, arcane list
3. Run:
   ```bash
   npm run knowledge -- compare-loadout "Coda Hema" \
     --mods "Serration,Split Chamber,Vital Sense,Hunter Munitions,Rime Rounds,Malignant Force" \
     --arcanes "Primary Merciless"
   ```
4. Honor markers in the output:
   - `LOCAL_BUILDS_AVAILABLE` → summarize closest rank, missing mods, extras
   - `ONLINE_SEARCH_CONFIRMATION_REQUIRED` → **do not ask yes/no** — crawl only if Online is opted in (WebUI Online search toggle, or Operator said “search online” in Hermes); else stay local
5. If builds are missing locally, suggest residential crawl / HTML import (`overframe-import` skill) or `community-search` when opted in.

## Output shape

- Closest local Overframe rank + overlap %
- Missing mods / arcanes vs that build
- Extra mods on the Operator’s loadout
- Online status (`local-only` | `opted-in-crawl` | `n/a`)
- One practical next change
