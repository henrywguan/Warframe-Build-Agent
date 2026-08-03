# Mobile web chat UI

A phone-friendly chat front-end lives in [`web/`](../web/). It talks to an OpenAI-compatible model and can call this repo’s Warframe Status, Warframe.market, and official patch-notes helpers for live / daily-scrape data.

The UI uses a Warframe arsenal-inspired theme (void panels, Orokin gold, energy cyan) with a **center-stage Ordis cephalon**: an original SVG/CSS animation (not game assets) that idles, thinks while the model is working, and ripples/“speaks” when a reply lands. Favicon / PWA icons use `web/public/ordis-icon.svg` plus the PNG sizes next to it.

## Why this exists

Cursor Cloud / desktop chat is great while coding. This UI is for **on-the-go** questions from a phone browser (and can be installed as a home-screen web app).

## Quick start (local)

```bash
cd web
cp .env.example .env.local
# put OPENAI_API_KEY in .env.local
npm install
npm run dev
```

Open http://localhost:3000

From repo root you can also run:

```bash
npm run web:dev
```

Locally, daily-scrape tools also try `../data/market/` and `../data/patches/` when env URLs are unset.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Model access |
| `OPENAI_MODEL` | no | Default `gpt-4o-mini` |
| `OPENAI_BASE_URL` | no | OpenAI-compatible proxy/base URL |
| `CHAT_PASSWORD` | no | If set, gates the UI with a simple password cookie |
| `MARKET_CHANGES_URL` | no | URL to `data/market/latest-changes.json` from the daily market job |
| `PATCH_CHANGES_URL` | no | URL to `data/patches/latest-changes.json` from the daily patch job |
| `PATCH_SNAPSHOT_URL` | no | URL to `data/patches/latest-snapshot.json` (fallback if live hub fetch fails) |

## Deploy (Vercel, etc.)

1. Set the project **root directory** to `web` (or deploy from `web/`).
2. Add env vars: `OPENAI_API_KEY`, optional `CHAT_PASSWORD`, optional model/base URL.
3. For daily scrapes after Actions commit to `main`, set:
   - `MARKET_CHANGES_URL` → raw `data/market/latest-changes.json`
   - `PATCH_CHANGES_URL` → raw `data/patches/latest-changes.json`
   - optional `PATCH_SNAPSHOT_URL` → raw `data/patches/latest-snapshot.json`
4. Ensure the host can reach:
   - your model provider
   - `https://api.warframestat.us`
   - `https://api.warframe.market`
   - `https://www.warframe.com` (live patch-notes hub)
5. Deploy.

Live `get_market_price` and `get_patch_notes_latest` work on any deploy. Saved day-over-day diffs need the `*_CHANGES_URL` env vars (or local `data/` files during repo-root/dev runs).

## Slash commands

Type **`/list`** in the chat for the full catalog. Common ones:

| Command | Result |
| --- | --- |
| `/list` | Show available commands |
| `/fissures [sp] [tier]` | Live fissures |
| `/cycles` / `/sortie` / `/alerts` / `/invasions` | Live worldstate slices |
| `/market <slug>` | Live Warframe.market price |
| `/market-changes` | Daily 4pm Pacific market scrape |
| `/patches` / `/hotfix` | Latest official updates/hotfixes |
| `/patch-changes` | Daily 4pm Pacific newly listed notes |

Slash commands are handled without the LLM when possible (faster / cheaper). Plain-language questions still go through the model + tools.

Full shared catalog: [`docs/commands.md`](commands.md).

## What the chat can tool-call

- Worldstate summary, fissures, cycles, sortie, invasions, alerts
- Warframe.market v2 price by slug
- Latest saved daily market changes (4pm Pacific job)
- Latest official updates/hotfixes (live hub scrape)
- Newly listed patch notes since the previous daily snapshot (4pm Pacific job)

## Security notes

- Keep `OPENAI_API_KEY` server-side only (never in client code).
- For a personal phone shortcut, set `CHAT_PASSWORD` so random visitors can’t spend your API credits.
- This is a lightweight personal relay, not a full multi-user auth system.
