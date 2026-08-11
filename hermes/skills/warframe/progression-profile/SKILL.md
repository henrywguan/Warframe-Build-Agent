---
name: progression-profile
description: MR, quest, and owned-mod aware progression advice — what to do next in Warframe.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Progression, Onboarding, MR]
    category: warframe
---

# Progression profile

## When to use

Operator shares MR/quest/owned gear and asks what to focus on next.

## Procedure

1. Capture profile: MR, quest milestone, owned frames/weapons/mods, goal (story/SP/plat/fun).
2. Offline pack:
   - `npm run knowledge -- lookup "<target>"`
   - `npm run knowledge -- farm "<target>"`
3. MR ≤10 → new-player-onboarding patterns; mid/end → budget-upgrade-path / steel-path-loadout.
4. Prioritize one quest, one frame, one weapon — avoid overload.
5. MR gates + essential mods with farm routes.
6. Skip basics if owned; advance to forma/arcanes/helminth/SP.
7. Plat budget: `npm run market -- price <slug>`.

## Output shape

- Profile summary
- Do this next (primary + optional)
- Why + prerequisites
- Mod/frame gaps
- Rough timeline
- Next step
