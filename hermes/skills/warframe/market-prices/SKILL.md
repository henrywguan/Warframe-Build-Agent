---
name: market-prices
description: Check Warframe.market v2 listing prices, resolve slugs, and interpret daily watchlist changes carefully.
version: 0.4.0
metadata:
  hermes:
    tags: [Warframe, Market, Trading]
    category: warframe
    related_skills: [world-state, trade-value, farm-vs-buy]
---

# Market prices

## When to use

Player asks what something is worth, the market slug for a name, whether to buy/sell, **in-game sellers / whisper copy**, or how a watchlist item moved day-over-day.

## Procedure

1. Resolve item **slugs** when unknown:
   - `npm run market -- slug-search "<name>"`
2. Prefer live Warframe.market v2 top orders for a **price summary**:
   - `GET https://api.warframe.market/v2/orders/item/{slug}/top`
   - Or repo CLI: `npm run market -- price <slug>`
3. When the player wants **in-game sellers / whisper paste / Buy**:
   - Web: `/wfm "<item>"` or tool `lookup_market_sellers`
   - CLI: `npm run market -- wfm "Primed Continuity"`
   - Filter: `type=sell`, `user.status=ingame`, max rank when present; cheapest 5
4. Prefer the highest **sell rank** present in top orders when ranks exist.
5. Treat values as **listing snapshots**, not guaranteed clears.
6. For day-over-day moves, use saved daily snapshots / `npm run market -- changes` when available (4pm Pacific job).
7. Always caveat volatility.

## References

- `skill_view("market-prices", "references/warframe-market.md")`

## Output shape

- Item + rank assumed
- Lowest sell / highest buy (and median if useful)
- Day-over-day delta if available
- Caveat + next step
