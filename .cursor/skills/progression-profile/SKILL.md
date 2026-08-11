---
name: progression-profile
description: MR, quest, and owned-mod aware progression advice — what to do next in Warframe.
---

# Progression profile

## When to use

Player shares their stage (MR, star chart progress, owned frames/mods) and asks what to focus on next — quests, frames, weapons, or systems.

## Steps

1. Capture **profile inputs** (ask only if missing and it changes the answer):
   - Mastery Rank, main quest milestone (e.g. Second Dream, War Within, New War)
   - Owned frames/weapons/mods (paste or summary)
   - Goal: story, Steel Path prep, earning plat, casual fun
2. Ground recommendations in the offline pack:
   - `npm run knowledge -- lookup "<frame, weapon, or system>"`
   - `npm run knowledge -- farm "<target>"` for next acquisitions
3. Use **new-player-onboarding** patterns for MR ≤10; shift to **steel-path-loadout** / **budget-upgrade-path** for mid/endgame.
4. Prioritize **one quest chain**, **one frame**, and **one weapon** slot — avoid overwhelming lists.
5. Flag **MR-gated** items and **essential mods** (Serration, Vitality, Hornet Strike, Pressure Point, etc.) with farm routes.
6. If they own key mods already, skip to forma, arcanes, helminth, or SP unlock.
7. Cross-check market for expensive gaps: `npm run market -- price <slug>` when plat budget matters.

## Output shape

- **Profile summary** (MR, quest, goal)
- **Do this next** (1 primary + 1 optional)
- **Why** (unlocks, power spike, fun)
- **Prerequisites** (quest, node, resource)
- **Mod/frame gaps** to fill
- **Timeline** (rough: this week / after quest X)
- **Next step** (start quest, farm node, run `/knowledge`)
