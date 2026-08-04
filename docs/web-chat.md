# Mobile web chat UI

A phone-friendly chat front-end lives in [`web/`](../web/). It can run against an OpenAI-compatible model **or** a fully local knowledge chatbot (`CHAT_MODE=local` / no API key). It supports **loadout screenshot attachments** (vision model or local OCR) to compare against top-3 Overframe builds in the offline pack, plus Warframe Status, Warframe.market, and official patch-notes helpers.

The UI uses a Warframe arsenal-inspired theme (void panels, Orokin gold, energy cyan) with a **center-stage Ordis cephalon**: an original SVG/CSS animation (not game assets) that idles, thinks while the model is working, and ripples/“speaks” when a reply lands. Favicon / PWA icons use `web/public/ordis-icon.svg` plus the PNG sizes next to it.

## Why this exists

Cursor Cloud / desktop chat is great while coding. This UI is for **on-the-go** questions from a phone browser (and can be installed as a home-screen web app).

## Quick start (local)

```bash
cd web
cp .env.example .env.local
# Option A: OPENAI_API_KEY (+ optional OPENAI_BASE_URL for Ollama/LM Studio/Qwen)
#   OPENAI_BASE_URL=http://127.0.0.1:11434/v1
#   OPENAI_API_KEY=ollama
#   OPENAI_MODEL=qwen3.6
# Option B: CHAT_MODE=local  (offline knowledge + OCR, no cloud LLM)
npm install
npm run dev
```

For Hermes Desktop with the same local model + pack, see [`docs/hermes-export.md`](hermes-export.md) and [`hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md).

Open http://localhost:3000

From repo root you can also run:

```bash
npm run web:dev
```

Locally, daily-scrape tools also try `../data/market/` and `../data/patches/` when env URLs are unset.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | for model mode | Model access (OpenAI or local server key) |
| `OPENAI_MODEL` | no | Default `gpt-4o-mini` |
| `OPENAI_VISION_MODEL` | no | Model used when a screenshot is attached |
| `OPENAI_BASE_URL` | no | OpenAI-compatible proxy/base URL (Ollama, LM Studio, …) |
| `CHAT_MODE` | no | `local` / `offline` = deterministic knowledge chatbot (no LLM) |
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

Type **`/list`** in the chat for the full catalog (web slashes, Cursor commands, CLI). Common web ones:

| Command | Result |
| --- | --- |
| `/list` | Show available commands |
| `/fissures [sp] [tier]` | Live fissures |
| `/cycles` / `/sortie` / `/alerts` / `/invasions` | Live worldstate slices |
| `/market <slug>` | Live Warframe.market price |
| `/market-changes` | Daily 4pm Pacific market scrape |
| `/patches` / `/hotfix` | Latest official updates/hotfixes |
| `/patch-changes` | Daily 4pm Pacific newly listed notes |
| `/knowledge <query>` | Offline knowledge pack lookup (no LLM) |
| `/compare <item> \| mods…` | Compare a pasted loadout to top 3 local Overframe builds |
| `/dps <weapon> [vs <weaponB>] [--preset …]` | Offline modded DPS estimate / A vs B compare |

**Screenshot compare:** use **Attach** in the composer, then Send. With a vision model configured, the agent reads item/mods/arcanes from the image and calls `compare_loadout_to_overframe`. In `CHAT_MODE=local`, tesseract OCR + the local pack do the same without OpenAI.

**Modded DPS:** plain-language “Torid vs Ignis Wraith damage?” or `/dps Torid vs Ignis Wraith --preset typical` uses the offline calculator (no live search).

Slash commands are handled without the LLM when possible (faster / cheaper). Plain-language questions use the model + tools when configured, otherwise the local chatbot.

Full shared catalog: [`docs/commands.md`](commands.md). Cursor cleanup modes: [`docs/cleanup-agent.md`](cleanup-agent.md) (`/cleanup-simplify`, `/cleanup-simplify -all`).

## What the chat can tool-call

- Worldstate summary, fissures, cycles, sortie, invasions, alerts
- Warframe.market v2 price by slug
- Latest saved daily market changes (4pm Pacific job)
- Latest official updates/hotfixes (live hub scrape)
- Newly listed patch notes since the previous daily snapshot (4pm Pacific job)
- Offline knowledge lookup (`lookup_local_knowledge`) — items, mechanics digests, arcane digests, Overframe builds
- Loadout vs top-3 Overframe compare (`compare_loadout_to_overframe`)
- Offline modded DPS / A vs B (`estimate_modded_dps`)

## Security notes

- Keep `OPENAI_API_KEY` server-side only (never in client code).
- For a personal phone shortcut, set `CHAT_PASSWORD` so random visitors can’t spend your API credits.
- This is a lightweight personal relay, not a full multi-user auth system.
