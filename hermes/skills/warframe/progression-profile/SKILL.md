---
name: progression-profile
description: MR, quest, and owned-mod aware progression advice — what to do next in Warframe.
version: 0.4.0
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
2. Persist / reload when useful (Hermes CLI; web `/profile` is stub-only):
   - `npm run knowledge -- profile`
   - `npm run knowledge -- profile-set [--mr N] [--steel-path] [--budget low|mid|high] [--platform pc] [--playstyle text] [--goal text]`
3. Offline pack:
   - `npm run knowledge -- lookup "<target>"`
   - `npm run knowledge -- farm "<target>"`
4. MR ≤10 → new-player-onboarding patterns; mid/end → budget-upgrade-path / steel-path-loadout.
5. Prioritize one quest, one frame, one weapon — avoid overload.
6. MR gates + essential mods with farm routes.
7. Skip basics if owned; advance to forma/arcanes/helminth/SP.
8. Plat budget: `npm run market -- slug-search` / `price <slug>`.

## Output shape

- Profile summary
- Do this next (primary + optional)
- Why + prerequisites
- Mod/frame gaps
- Rough timeline
- Next step
