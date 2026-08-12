---
name: patch-notes
description: Check Warframe game updates, hotfixes, and patch notes from the official hub and saved daily snapshots.
---

# Patch notes

## When to use

Player asks what changed recently, whether a hotfix dropped, or what the latest update is.

## Steps

1. Prefer repo tools:
   - `npm run patches -- latest` — hub titles/links
   - `npm run patches -- detail [version|url|latest]` — **full official page text** (required for synopsis / “what’s in X”)
   - `npm run patches -- changes` (after daily snapshots exist)
2. Source of truth: https://www.warframe.com/en/patch-notes (individual pages under `/en/patch-notes/pc/<slug>`)
3. Distinguish **Update** vs **Hotfix**, link the specific notes page, and note the hub’s Newest marker when present.
4. Remind the player that patch-sensitive builds/stats should be re-checked after big updates.
5. Do not invent patch contents — summarize from `detail` output or the linked official page only. If fetch fails, say so and give the URL.

## Output shape

- Latest / new since yesterday
- Type (Update vs Hotfix) + version
- Link
- Synopsis from official detail text (1–3 bullets for hotfixes; longer for updates)
- Caveat + next step
