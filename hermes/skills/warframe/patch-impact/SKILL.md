---
name: patch-impact
description: Map official patch notes and hotfixes to build, weapon, and mod recommendations the operator should revisit.
version: 0.4.0
metadata:
  hermes:
    tags: [Warframe, Patches, Builds, Balance]
    category: warframe
    related_skills: [patch-notes]
---

# Patch impact

## When to use

Operator asks how a recent update affects a build, weapon tier, or farm plan — or wants patch-driven upgrade advice.

## Procedure

1. Fetch official changes (match webchat patch tools — hub alone is not enough for synopsis):
   - `npm run patches -- latest`
   - `npm run patches -- detail` or `detail <version|url>`
   - `npm run patches -- changes`
2. Source of truth: https://www.warframe.com/en/patch-notes — summarize from **detail** text, not titles alone.
3. Classify: bugfix, rebalance, new content, vault/unvault, mod/arcane tweak.
4. Map impact:
   - Weapon stats → rerun `compare-dps` if shifted
   - Mods/arcanes → flag affected loadouts
   - Drops → update farming advice
   - New items → suggest `npm run knowledge -- pull`
5. Separate confirmed patch text from speculation.
6. List action items: recalc, swap element, farm before nerf, wait for hotfix.
7. Note pack digests may lag until pull.

## Output shape

- Patch (Update vs Hotfix) + link
- What changed (facts from notes)
- Builds / items affected
- Recommended actions
- Pack refresh note
- Next step
