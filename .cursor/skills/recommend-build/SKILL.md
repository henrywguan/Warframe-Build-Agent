---
name: recommend-build
description: Recommend beginner, midgame, endgame, or budget Warframe weapon and frame builds with mod priorities and substitutions.
---

# Recommend a build

## When to use

Player wants a mod setup, “budget build”, “Steel Path config”, or upgrade path for a weapon/Warframe.

## Steps

1. Lock the stage: beginner / midgame / endgame / budget / min-max.
2. Check the local knowledge pack first (`npm run knowledge -- lookup "<item>"` or web tool `lookup_local_knowledge`) for wiki digests and Overframe top builds when present.
3. State the intended content and damage strategy (e.g. viral + slash, raw heat, corrosive + blast).
4. List **core mod priorities** first (must-have slots), then **flex slots**.
5. Call out expensive pieces (Galavanized, primed, arcanes) and give substitutions.
6. Mention relevant synergies: companion armor strip, primer, Roar, Eclipse, etc., only when they matter.
7. Note rivens as optional unless the weapon strongly wants one.
8. Remind the player to verify current mod costs/stats if the advice is patch-sensitive.

## Output shape

- **Role / content**
- **Core mods** (ordered)
- **Flex options**
- **Budget substitutions**
- **Premium upgrades**
- **Play tips** (1–3 lines)
- **Next farm / upgrade**
