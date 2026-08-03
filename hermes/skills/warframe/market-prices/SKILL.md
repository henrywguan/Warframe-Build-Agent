---
name: market-prices
description: Check Warframe.market v2 listing prices and interpret daily watchlist changes carefully.
version: 0.1.0
metadata:
  hermes:
    tags: [Warframe, Market, Trading]
    category: warframe
    related_skills: [world-state]
---

# Market prices

## When to use

Player asks what something is worth, whether to buy/sell, or how a watchlist item moved day-over-day.

## Procedure

1. Use item **slugs** (`mirage_prime_set`, `arcane_energize`).
2. Prefer live Warframe.market v2 top orders:
   - `GET https://api.warframe.market/v2/orders/item/{slug}/top`
   - Or repo CLI: `npm run market -- price <slug>`
3. Prefer the highest **sell rank** present in top orders when ranks exist.
4. Treat values as **listing snapshots**, not guaranteed clears.
5. For day-over-day moves, use saved daily snapshots / `npm run market -- changes` when available.
6. Always caveat volatility.

## References

- `skill_view("market-prices", "references/warframe-market.md")`

## Output shape

- Item + rank assumed
- Lowest sell / highest buy (and median if useful)
- Day-over-day delta if available
- Caveat + next step
