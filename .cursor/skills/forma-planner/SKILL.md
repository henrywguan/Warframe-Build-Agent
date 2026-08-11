---
name: forma-planner
description: Estimate Forma and polarity costs for Warframe, weapon, and companion builds.
---

# Forma planner

## When to use

Player asks how many Forma a build needs, which polarities to match first, or how to minimize Forma spend on a budget.

## Steps

1. Lock **item(s)** and target mod list (from pasted loadout, Overframe build, or recommended build).
2. Ground Forma mechanics in the offline pack:
   - `npm run knowledge -- lookup "Forma"`
3. Compare against **cached builds** for community forma counts when available:
   - `npm run knowledge -- builds "<item>"` — note `forma` field on ranked builds
4. For pasted loadouts, run:
   - `npm run knowledge -- compare-loadout "<item>" --mods "…"` — surface mod conflicts vs typical builds
5. Count **polarity mismatches** (−25% vs +25% drain) and prioritize:
   - Aura / stance / exilus first
   - Umbral sets and high-drain primed mods
   - Flex slots last
6. Give **forma range** (min–typical–max) rather than a false exact count when mods are uncertain.
7. Suggest **budget substitutions** (non-Primed, rank-0 acceptable) to save Forma.

## Output shape

- **Item + build source**
- **Estimated Forma** (min / typical / max)
- **Polarize-first slots** (ordered)
- **Mod swaps** to reduce Forma
- **Reactor/catalyst note** (if unranked capacity matters)
- **Next step** (apply Forma order, import build, paste loadout for compare)
