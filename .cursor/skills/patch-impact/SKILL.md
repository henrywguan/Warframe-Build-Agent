---
name: patch-impact
description: Map official patch notes and hotfixes to build, weapon, and mod recommendations the player should revisit.
---

# Patch impact

## When to use

Player asks how a recent update affects a build, weapon tier list, or farm plan — or wants patch-driven upgrade advice.

## Steps

1. Fetch official changes first:
   - `npm run patches -- latest`
   - `npm run patches -- changes` (daily diff when snapshots exist)
2. Source of truth: https://www.warframe.com/en/patch-notes — summarize, do not invent.
3. Classify change type: **bugfix**, **rebalance**, **new content**, **vault/unvault**, **arcane/mod tweak**.
4. Map impact to **player systems**:
   - Weapon base stats → rerun `compare-dps` if numbers shifted
   - Mod/arcanes → flag loadouts using touched mods
   - Drop tables → update farming-route advice
   - New items → suggest pack refresh (`npm run knowledge -- pull`)
5. Separate **confirmed** patch text from **community speculation**.
6. List **action items**: recalc DPS, swap element, farm before nerf, wait for hotfix.
7. Remind that saved pack digests may lag until `npm run knowledge -- pull`.

## Output shape

- **Patch** (Update vs Hotfix) + link
- **What changed** (bullet facts from notes)
- **Builds / items affected**
- **Recommended actions** (recheck, swap, farm, wait)
- **Pack refresh note**
- **Next step**
