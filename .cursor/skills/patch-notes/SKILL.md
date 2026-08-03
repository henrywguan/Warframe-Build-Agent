---
name: patch-notes
description: Check Warframe game updates, hotfixes, and patch notes from the official hub and saved daily snapshots.
---

# Patch notes

## When to use

Player asks what changed recently, whether a hotfix dropped, or what the latest update is.

## Steps

1. Prefer repo tools:
   - `npm run patches -- latest`
   - `npm run patches -- changes` (after daily snapshots exist)
2. Source of truth: https://www.warframe.com/en/patch-notes
3. Distinguish **Update** vs **Hotfix**, link the specific notes page, and note the hub’s Newest marker when present.
4. Remind the player that patch-sensitive builds/stats should be re-checked after big updates.
5. Do not invent patch contents — summarize from linked notes or saved snapshots only.

## Output shape

- Latest / new since yesterday
- Type (Update vs Hotfix) + version
- Link
- Practical impact (1–3 lines if known)
- Caveat + next step
