---
name: event-optimizer
description: Optimize timed Warframe events (Dog Days, Plague Star, etc.) — currency per run, reward priority, and farm plans.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Events, Farming, WorldState]
    category: warframe
---

# Event optimizer

## When to use

Operator asks how to farm a limited-time event, which rewards to prioritize, or currency per run/hour.

## Procedure

1. Lock event name, time left, and goal (cosmetics, mods, credits, mastery, ducats).
2. Pull live event data (`terminal.cwd` → repo root):
   - `npm run wf -- events`
   - `npm run wf -- summary` for expiry context
3. Ground rewards/mechanics in the offline pack:
   - `npm run knowledge -- lookup "<event or reward>"`
4. Check patch sensitivity: `npm run patches -- latest` when rules may have changed.
5. Estimate currency/run from mission length, bonuses, and squad roles.
6. Rank reward priority: time-limited → trade value → mastery → filler.
7. Tradable rewards: `npm run market -- price <slug>` vs grind time.
8. Do not invent nodes or token rates.

## Output shape

- Event status + expiry note
- Best mission/node for goal
- Currency per run (estimate + assumptions)
- Reward priority (must-have → skip)
- Squad/loadout tips
- Trade vs grind (if applicable)
- Next step
