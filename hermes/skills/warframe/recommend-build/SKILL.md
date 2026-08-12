---
name: recommend-build
description: Recommend beginner, midgame, endgame, or budget Warframe weapon and frame builds with mod priorities.
version: 0.4.0
metadata:
  hermes:
    tags: [Warframe, Builds, Mods, Overframe]
    category: warframe
---

# Recommend a build

## When to use

Operator wants a mod setup, budget build, Steel Path config, or upgrade path.

## Procedure

1. Lock the stage: beginner / midgame / endgame / budget / min-max.
2. Follow source policy (see `references/source-policy.md`):
   - Check the offline pack first: `npm run knowledge -- lookup "<item>"`
   - Pull arcane facts with `lookup "Arcane …"` / `Primary Merciless` when relevant
   - If local Overframe builds exist (`LOCAL_BUILDS_AVAILABLE`), compare from that cache (mods + arcanes)
   - If the Operator pastes their mods, run `compare-loadout` (see loadout-compare skill)
   - If missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`), **do not ask yes/no** — Online opted-in (WebUI Online search toggle, or Operator said “search online” in Hermes) gates Overframe / YouTube / online crawl; otherwise stay local + agent-calculated and tell them how to opt in
   - Never invent fake video URLs
3. Ground stats/mechanics in offline wiki/catalog/mechanics digests from the pack.
4. State intended content and damage strategy; use `dps` / `compare-dps` when they ask for numbers.
5. List **core mod priorities**, then **flex slots**, then **arcanes** when known.
6. Call out expensive pieces and give substitutions.
7. Mention synergies only when they matter.
8. Treat rivens as optional unless the weapon strongly wants one.
9. Name the build source (local Overframe cache / online community crawl / YouTube / agent-calculated).
10. Note patch/market sensitivity when relevant.

## Output shape

- Role / content
- Source (local Overframe cache / online / YouTube / agent-calculated)
- Core mods
- Flex options
- Arcanes (if known)
- Budget substitutions
- Premium upgrades
- Play tips
- Next farm / upgrade
