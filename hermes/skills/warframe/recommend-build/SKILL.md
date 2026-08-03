---
name: recommend-build
description: Recommend beginner, midgame, endgame, or budget Warframe weapon and frame builds with mod priorities.
version: 0.2.0
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
   - If local Overframe builds exist (`LOCAL_BUILDS_AVAILABLE`), compare from that cache (mods + arcanes)
   - If missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`), **ask yes/no** before Overframe / YouTube / online search
   - Only after **yes** may you use online community sources; never invent fake video URLs
   - If **no**, stay local + agent-calculated for the goal
3. Ground stats/mechanics in offline wiki/catalog facts from the pack.
4. State intended content and damage strategy.
5. List **core mod priorities**, then **flex slots**, then **arcanes** when known.
6. Call out expensive pieces and give substitutions.
7. Mention synergies only when they matter.
8. Treat rivens as optional unless the weapon strongly wants one.
9. Name the build source (local Overframe cache / online after consent / YouTube / agent-calculated).
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
