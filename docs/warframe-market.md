# Warframe.market integration

API base: **`https://api.warframe.market/v2/`**  
Site: https://warframe.market/

## What we pull

Warframe.market v2 exposes live listings (not a dedicated “daily % change” endpoint). This repo:

1. Reads the watchlist in [`config/market-watchlist.json`](../config/market-watchlist.json)
2. Fetches top sell/buy orders from `GET /v2/orders/item/{slug}/top`
3. Saves a Pacific-date snapshot under `data/market/`
4. Diffs against the previous snapshot for day-over-day platinum changes

Scheduled target: **4:00 PM America/Los_Angeles** (PST/PDT).

## CLI

```bash
npm run market -- status
npm run market -- price mirage_prime_set
npm run market -- snapshot
npm run market -- pull --force          # run now, ignore 4pm gate
npm run market -- changes
npm run market -- pull                  # used by GitHub Action (4pm Pacific only)
```

Options: `--watchlist`, `--data-dir`, `--platform`, `--json`.

## Saved files

| File | Meaning |
| --- | --- |
| `data/market/snapshot-YYYY-MM-DD.json` | That Pacific day's watchlist prices |
| `data/market/changes-YYYY-MM-DD.json` | Diff vs prior snapshot |
| `data/market/latest-snapshot.json` | Newest snapshot |
| `data/market/latest-changes.json` | Newest diff |

## Automation

GitHub Action [`.github/workflows/market-daily-prices.yml`](../.github/workflows/market-daily-prices.yml):

- Cron fires near 4pm Pacific (`23:00` and `00:00` UTC cover PDT/PST)
- Script exits cleanly if the current Pacific hour is not 16
- Commits updated `data/market/*` files back to the default branch when changes exist

## Player-facing caveats

- Values are **listing snapshots** (top orders), not guaranteed sale clears
- When listings include `rank`, snapshots prefer the **highest rank seen** in that top-order payload (e.g. max-rank arcanes/mods)
- Spreads, offline/online mix, and thin order books can still skew a single number
- Always re-check warframe.market before large trades
- Empty/missing previous snapshot = baseline day (no % change yet)

## Useful v2 routes used here

| Route | Use |
| --- | --- |
| `GET /items` | Catalog + display names |
| `GET /items/{slug}` | Single item metadata |
| `GET /orders/item/{slug}/top` | Top sell/buy orders for pricing |
