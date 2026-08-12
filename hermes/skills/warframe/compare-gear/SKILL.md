---
name: compare-gear
description: Compare Warframe weapons, Warframes, companions, or gear for Steel Path, budget, or progression goals.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Builds, Comparison]
    category: warframe
---

# Compare gear

## When to use

Operator asks which option is better, “A vs B”, or wants a shortlist for a role.

## Procedure

1. Confirm the goal (Steel Path, star chart, EDA/ETA, farming, fashion, etc.) and hard constraints.
2. Pull stats/mechanics from the offline knowledge pack first (`npm run knowledge -- lookup "<item>"`), then wiki-backed knowledge.
3. For raw damage questions under a shared mod plan, run `npm run knowledge -- compare-dps "<A>" "<B>" --preset typical` (see modded-dps skill).
4. For community build context, prefer local Overframe cache; if missing, enable Online search toggle for live crawl if missing (never ask yes/no) (see recommend-build source policy).
5. Compare with a short table or bullets:
   - Damage profile
   - Crit vs status lean
   - Usability (AoE, ammo, reload)
   - Survivability impact
   - Accessibility (MR, farm path, plat cost)
   - Build cost to feel good
6. Recommend one primary pick, plus when the runner-up wins.
7. Suggest one next step.

## Output shape

- **Pick**
- **Why** (2–4 bullets)
- **Tradeoffs**
- **When to choose the alternative**
- **Next step**

## References

Load `skill_view("compare-gear", "references/sources.md")` if source-priority context is needed.
