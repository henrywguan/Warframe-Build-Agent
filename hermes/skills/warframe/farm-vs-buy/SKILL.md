---
name: farm-vs-buy
description: Decide whether to farm or buy a Warframe item by combining acquisition routes with live market prices.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Farming, Market, Trade]
    category: warframe
---

# Farm vs buy

## When to use

Operator asks farm vs buy, time/plat comparison, or a single decision for mods, parts, arcanes, or resources.

## Procedure

1. Lock item, quantity, budget (plat + time), MR/quest gates.
2. Farm path (offline pack):
   - `npm run knowledge -- lookup "<item>"`
   - `npm run knowledge -- farm "<item>"`
3. Buy path (live market):
   - `npm run market -- slug-search "<name>"` if slug unknown
   - `npm run market -- price <slug>`
   - `npm run market -- changes` for daily moves (4pm Pacific)
4. Compare efficiency vs accessibility: drop rate/rotation vs median price; tradable? vaulted?
5. State break-even intuition without inventing drop rates.
6. Hybrid when useful (buy vaulted, farm common).
7. Follow `references/source-policy.md` — pack for drop facts, market for prices.

## Output shape

- Recommendation (farm / buy / hybrid)
- Farm route + prerequisites
- Market snapshot + volatility note
- Tradeoffs (time, plat, RNG, MR)
- Next step
