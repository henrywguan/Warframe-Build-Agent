---
name: farm-vs-buy
description: Decide whether to farm or buy a Warframe item by combining acquisition routes with live market prices.
---

# Farm vs buy

## When to use

Player asks “should I farm or buy?”, wants a time/plat comparison, or needs a single decision for a mod, part, arcane, or resource.

## Steps

1. Lock the item, quantity, budget (plat + time), and MR/quest gates.
2. **Farm path** — offline pack first:
   - `npm run knowledge -- lookup "<item>"`
   - `npm run knowledge -- farm "<item>"` when acquisition routing is needed
3. **Buy path** — live market:
   - `npm run market -- slug-search "<item name>"` if slug unknown
   - `npm run market -- price <slug>`
   - `npm run market -- changes` for recent daily snapshot moves (4pm Pacific)
4. Compare **efficiency vs accessibility**:
   - Drop rate / rotation / key cost vs median listing price
   - Whether the item is tradable at all
   - Vaulted Prime parts → trade often wins unless unvault is active
5. State **break-even intuition** (e.g. “~2h farm vs 30p buy”) without inventing drop rates.
6. If farming wins but slow, suggest **hybrid** (buy missing vaulted part, farm common piece).
7. Follow [`docs/source-policy.md`](../../../docs/source-policy.md) — no live web for drop facts when pack answers.

## Output shape

- **Recommendation** (farm / buy / hybrid) in one line
- **Farm route** (node, rotation, prerequisites)
- **Market snapshot** (median/avg, volatility note)
- **Tradeoffs** (time, plat, RNG, MR)
- **Next step** (start farm, set buy order, check fissures)
