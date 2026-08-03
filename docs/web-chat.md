# Mobile web chat UI

A phone-friendly chat front-end lives in [`web/`](../web/). It talks to an OpenAI-compatible model and can call this repo’s Warframe Status + Warframe.market helpers for live data.

The UI uses a Warframe arsenal-inspired theme (void panels, Orokin gold, energy cyan) with a **center-stage Ordis cephalon**: an original SVG/CSS animation (not game assets) that idles, thinks while the model is working, and ripples/“speaks” when a reply lands. Favicon / PWA icons use the same Ordis mark (`web/public/ordis-icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`).

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

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Model access |
| `OPENAI_MODEL` | no | Default `gpt-4o-mini` |
| `OPENAI_BASE_URL` | no | OpenAI-compatible proxy/base URL |
| `CHAT_PASSWORD` | no | If set, gates the UI with a simple password cookie |
| `MARKET_CHANGES_URL` | no | URL to `latest-changes.json` from the daily market job |

## Deploy (Vercel, etc.)

1. Set the project **root directory** to `web` (or deploy from `web/`).
2. Add env vars: `OPENAI_API_KEY`, optional `CHAT_PASSWORD`, optional model/base URL.
3. Ensure the host can reach:
   - your model provider
   - `https://api.warframestat.us`
   - `https://api.warframe.market`
4. Deploy.

Live `get_market_price` works on any deploy. Saved day-over-day changes need `MARKET_CHANGES_URL` pointing at `data/market/latest-changes.json` (for example a raw GitHub URL after the daily job commits).

## What the chat can tool-call

- Worldstate summary, fissures, cycles, sortie, invasions, alerts
- Warframe.market v2 price by slug
- Latest saved daily market changes (when snapshot data exists)

## Security notes

- Keep `OPENAI_API_KEY` server-side only (never in client code).
- For a personal phone shortcut, set `CHAT_PASSWORD` so random visitors can’t spend your API credits.
- This is a lightweight personal relay, not a full multi-user auth system.
