---
name: trade-value
description: Price Warframe items via Warframe.market v2 CLI and interpret daily snapshot changes for buy/sell decisions.
---

# Trade value

## When to use

Player asks what something costs, whether to buy or sell, or how a price moved day-over-day.

## Steps

1. Resolve the item **slug** (`mirage_prime_set`, `arcane_energize`, `primed_continuity`).
2. Prefer repo CLI over guessing:
   - `npm run market -- price <slug>`
   - `npm run market -- changes` (after daily 4pm Pacific snapshots exist)
   - `npm run market -- status` for pull health
3. When ranks exist (rivens, arcanes, mods), use the **highest sell rank** present in top orders unless the player specified rank.
4. Present **lowest sell**, **highest buy**, and median if useful — label as listing snapshots, not guaranteed trades.
5. Compare **farm time vs plat** when advising buy vs farm (link farming-route skill if needed).
6. Caveat **volatility**: Baro items, new primes, arcane rank spikes, patch hype.
7. For watchlist items, reference `config/market-watchlist.json` when explaining daily diffs.
8. Do not promise future prices; suggest re-check before large trades.

## Output shape

- **Item** + slug + rank assumed
- **Lowest sell / highest buy**
- **Day-over-day delta** (if snapshot available)
- **Buy vs farm** lean
- **Volatility caveat**
- **Next step** (list, buy, wait, pull fresh)
