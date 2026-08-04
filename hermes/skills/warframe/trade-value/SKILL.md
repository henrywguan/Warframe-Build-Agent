---
name: trade-value
description: Price Warframe items via Warframe.market v2 CLI and interpret daily snapshot changes for buy/sell decisions.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Market, Trading]
    category: warframe
    related_skills: [market-prices]
---

# Trade value

## When to use

Operator asks what something costs, whether to buy or sell, or how a price moved day-over-day.

## Procedure

1. Resolve item **slug** (`mirage_prime_set`, `arcane_energize`).
2. Prefer repo CLI:
   - `npm run market -- price <slug>`
   - `npm run market -- changes` (after daily 4pm Pacific snapshots)
   - `npm run market -- status`
3. Use highest **sell rank** in top orders when ranks exist unless operator specified rank.
4. Present lowest sell, highest buy — listing snapshots, not guaranteed trades.
5. Compare farm time vs plat when advising buy vs farm (see farming-route skill).
6. Caveat volatility: Baro, new primes, arcane spikes, patch hype.
7. Do not promise future prices.

## Output shape

- Item + slug + rank assumed
- Lowest sell / highest buy
- Day-over-day delta (if available)
- Buy vs farm lean
- Volatility caveat
- Next step
