---
name: patch-notes
description: Check Warframe game updates, hotfixes, and patch notes from the official hub and saved daily snapshots.
version: 0.4.0
metadata:
  hermes:
    tags: [Warframe, Patches, Hotfix]
    category: warframe
---

# Patch notes

## When to use

Operator asks what changed recently, whether a hotfix dropped, or what the latest update is.

## Steps

1. Prefer repo tools (checkout cwd):
   - `npm run patches -- latest` — hub titles/links
   - `npm run patches -- detail [version|url|latest]` — full official page text (required for synopsis)
   - `npm run patches -- changes` (after daily snapshots exist)
2. Source of truth: https://www.warframe.com/en/patch-notes
3. Distinguish **Update** vs **Hotfix**, link the specific notes page, and note the hub’s Newest marker when present.
4. Remind the Operator that patch-sensitive builds/stats should be re-checked after big updates.
5. Do not invent patch contents — summarize from `detail` output or linked notes only.

## Output shape

- Latest / new since yesterday
- Type (Update vs Hotfix) + version
- Link
- Practical impact from official text
- Caveat + next step
