---
name: recommend-build
description: Recommend beginner, midgame, endgame, or budget Warframe weapon and frame builds with mod priorities and substitutions.
---

# Recommend a build

## When to use

Player wants a mod setup, “budget build”, “Steel Path config”, or upgrade path for a weapon/Warframe.

## Steps

1. Lock the stage: beginner / midgame / endgame / budget / min-max.
2. Follow [`docs/source-policy.md`](../../../docs/source-policy.md) for build sources:
   - Always check the offline pack first (`npm run knowledge -- lookup "<item>"` / `lookup_local_knowledge`) and compare from local data
   - If local Overframe builds are missing, **ask yes/no** before any Overframe / YouTube / online search
   - Only after explicit **yes** may you use online community sources (never invent fake video URLs)
   - If **no**, stay local + agent-calculated for the goal
3. Ground stats/mechanics in offline wiki/catalog facts from the pack (do not live-browse for those).
4. State the intended content and damage strategy (e.g. viral + slash, raw heat, corrosive + blast).
5. List **core mod priorities** first (must-have slots), then **flex slots**.
6. Call out expensive pieces (Galavanized, primed, arcanes) and give substitutions.
7. Mention relevant synergies: companion armor strip, primer, Roar, Eclipse, etc., only when they matter.
8. Note rivens as optional unless the weapon strongly wants one.
9. Name the build source (Overframe cache, YouTube/creator, or agent-calculated).
10. Remind the player to verify current mod costs/stats if the advice is patch-sensitive.

## Output shape

- **Role / content**
- **Source** (Overframe / YouTube / agent-calculated)
- **Core mods** (ordered)
- **Flex options**
- **Budget substitutions**
- **Premium upgrades**
- **Play tips** (1–3 lines)
- **Next farm / upgrade**
