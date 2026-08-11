---
name: event-optimizer
description: Optimize timed Warframe events (Dog Days, Plague Star, etc.) — currency per run, reward priority, and farm plans.
---

# Event optimizer

## When to use

Player asks how to farm a limited-time event, which rewards to prioritize, or how much currency they can earn per run/hour.

## Steps

1. Lock the event name, time left, and player goal (cosmetics, mods, credits, mastery, ducats).
2. Pull **live** event data first:
   - `npm run wf -- events`
   - `npm run wf -- summary` for expiry context
3. Ground rewards and mechanics in the offline pack:
   - `npm run knowledge -- lookup "<event name or reward item>"`
   - `npm run knowledge -- lookup "Steel Path"` / faction drop mechanics when event nodes scale
4. Check **patch sensitivity** — `npm run patches -- latest` if event rules or rewards may have changed recently.
5. Estimate **currency/run** from stated mission length, bonus multipliers, and squad roles (buffer, loot frame, speed).
6. Rank **reward priority**: time-limited exclusives → high trade value → mastery → filler.
7. If a reward is tradable, cross-check `npm run market -- price <slug>` vs grind time.
8. Do not invent event nodes or token rates; cite worldstate + pack digests only.

## Output shape

- **Event status** (active, expires ~when, platform note)
- **Best mission / node** for the stated goal
- **Currency per run** (estimate + assumptions)
- **Reward priority table** (must-have → skip)
- **Squad / loadout tips** (1–2 lines)
- **Trade vs grind** (if applicable)
- **Next step** (start node, check `/event`, refresh pack)
