# Mobile web chat UI

A phone-friendly chat front-end lives in [`web/`](../web/). It can run against an OpenAI-compatible model **or** a fully local knowledge chatbot (`CHAT_MODE=local` / no API key). It supports **loadout screenshot attachments** (vision model or local OCR) to compare against top-3 Overframe builds in the offline pack, plus Warframe Status, Warframe.market, and official patch-notes helpers.

The UI uses a Warframe arsenal-inspired theme (void panels, Orokin gold, energy cyan) plus tertiary accents (**ember** copper, **signal** verdant, **plasma** ice-blue, **mist** steel) for depth. A **center-stage Ordis cephalon** (original WebP mood plates + SVG/CSS fallback, not game assets) sits **above** the transmission log — it idles, thinks, and glitch-pops when speaking, and never overlays chat text. Mood plates live under `web/public/ordis/` (hero / glow / ring overlays); the SVG remains for load errors and tiny stage sizes. The stage caption row is reserved so status text is not clipped. Behind the shell, a modular **Three.js void field** (`VoidField`) draws mood-reactive particles and wireframe crystals (DPR-capped, paused when the tab is hidden; CSS fallback when `prefers-reduced-motion` is on).

**Chat memory:** Persistent left **Transmissions** sidebar (Copilot / Open WebUI style) with New chat, switch, rename (✎ or double-click title), and delete. On desktop (≥861px) a left **Orbiter taskbar** sits on the far left of the viewport (icon dock; selected labels expand down under the icon, arsenal palette) for Transmissions, Builds, and **/wfm**. Minimize Transmissions or Builds to a pip on that dock, then click the icon to restore. Both desktop side panels are width/height resizable (edge + corner handles). The taskbar bottom aligns with the transmission log (status lives inside the chat panel). Extra column gap plus a centered chat column keep the dock away from the log. On narrow phones the sidebar slides in from a **Chats** control. Clear still wipes the current log. Conversations persist in browser `localStorage`. Screenshot attachments are not stored in history.

**Saved Builds:** Desktop right **Arsenal** rail (≥861px), same taskbar restore when minimized. On phones, a **Builds** control (next to **Chats**) opens the same pane as a right-side drawer. Folder chips, scrollable cards (Warframe / weapons / companion / mods / arcanes / archon crystals), editable names, and **+ / −** controls. Add via the pane, `/save-build`, natural language (“save a Soma Prime build” + mods/arcanes/crystals), or by attaching a loadout screenshot and asking to save — the agent auto-classifies Warframe / Primary / Secondary / Melee from the catalog (companions via name hints). Persists in browser `localStorage` (`wfba_saved_builds_v1`). Favicon / PWA icons use `web/public/ordis-icon.svg` plus the PNG sizes next to it.

**Assistant markup:** Agent replies render as Markdown (GFM: lists, tables, code fences, links). Raw HTML in replies is skipped. User bubbles stay plain text.

**Prompt chips:** Beside AI / LLM / Online search, the dock shows **contextual follow-up prompts** when the thread has useful signals (starters on a fresh chat; build/farm/market/patch/worldstate follow-ups after replies). When nothing useful matches, it falls back to `/list`, `/fissures sp`, and `/patches`.

**Pending reply:** While Ordis generates an answer, the transmission log shows a glowing three-bar loader (Uiverse-inspired, arsenal palette) with “Ordis is consulting…”.

For a full inventory of colors, typography, layout, components, and motion tokens (handy when redesigning), see **[`web-chat-design.md`](web-chat-design.md)**.

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

From the chat UI:

| Toggle | Job |
| --- | --- |
| **LLM / Ollama** | Configure model **and** enable LLM mode (smart replies + tools). Off / unconfigured = offline local chatbot. Saving a valid config enables the Warframe LLM advisor without turning AI on. |
| **AI** | Mode switch **on top of LLM**: general Cursor-style research agent (non-Warframe-first). Off = keep Warframe Build Agent LLM personality/tools. Requires LLM. Not a full IDE agent (no filesystem/terminal/MCP — use Hermes Desktop for that). |
| **Online search** | Warframe community-build crawl consent only (`search_community_builds`: Overframe + DuckDuckGo/YouTube + Wiki + a short full-page excerpt). Standing consent — never asks the player to type yes/no. Saving/adding a personal card skips this crawl and calls `save_build` only (avoids overflowing local 8k-context models). |

Also:

- **Full page fetch** — with LLM mode or Online search on, `fetch_web_page` reads a specific public URL into text (also auto-used on top search hits; Jina Reader fallback when direct fetch is empty/blocked).
- **`search_web`** — available in LLM mode (Warframe advisor or AI general agent). Does **not** append `warframe` to general queries (recipes, how-tos, etc.). Warframe Wiki is included only when the query looks Warframe-related.

Preferences (`aiChat` = general agent, `onlineSearch`) plus browser `llm` config are sent on each `/api/chat` request.

From repo root you can also run:

```bash
npm run web:dev
```

Locally, daily-scrape tools also try `../data/market/` and `../data/patches/` when env URLs are unset.

## Use from another device on your home Wi‑Fi (LAN)

`allowedDevOrigins` and “blocked cross-origin … `/_next/webpack-hmr`” are **development-only**. Production `next start` has no webpack HMR, so that whitelist does not apply there.

### Option A — Dev server on the LAN (hot reload)

1. Repo already allows private LAN origins in [`web/next.config.ts`](../web/next.config.ts) (`192.168.*.*`, `10.*.*.*`, `172.16–31.*.*`), so phones do not need a one-off IP entry like `192.168.1.58`.
2. Bind all interfaces (not only localhost):

```bash
npm run web:dev:lan
```

3. On your PC, note the **Network** URL Next prints (e.g. `http://192.168.1.12:3000`). Open that on your phone (same Wi‑Fi).
4. Restart the dev server after changing `next.config.ts`.
5. Windows Firewall may ask to allow Node on private networks — allow it for port **3000**.

Do **not** expose `next dev` to the public internet; the allowlist only softens the LAN HMR guard.

### Option B — Production build on the LAN (no HMR, no origin whitelist)

Better when you only need the chat to work from phones (no live code reload):

```bash
npm run web:build
npm run web:start:lan
```

Then open `http://<your-pc-lan-ip>:3000` from any device. Same firewall note as above. Prefer setting `CHAT_PASSWORD` if untrusted people share the Wi‑Fi.

### Why you saw `192.168.1.58` blocked

The page can load (`GET / 200`), but Next blocked the phone’s origin from the **dev** Hot Module Replacement websocket (`/_next/webpack-hmr`). Adding that host (or the private ranges we ship) fixes HMR/hydration during `next dev`. It is not required for Option B.

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

## Deploy (public URL + OpenAI)

Full guide (Vercel, Fly.io / Railway, VPS, launch checklist): **[`hosting.md`](hosting.md)**.

### Quick path — Vercel

1. Set the project **root directory** to `web` (or deploy from `web/`).
2. Add env vars: `OPENAI_API_KEY`, **`CHAT_PASSWORD`**, optional `OPENAI_MODEL` / `OPENAI_VISION_MODEL` / base URL.
3. For daily scrapes after Actions commit to `main`, set:
   - `MARKET_CHANGES_URL` → raw `data/market/latest-changes.json`
   - `PATCH_CHANGES_URL` → raw `data/patches/latest-changes.json`
   - optional `PATCH_SNAPSHOT_URL` → raw `data/patches/latest-snapshot.json`
4. Ensure the host can reach your model provider, `api.warframestat.us`, `api.warframe.market`, and `warframe.com`.
5. Deploy. Chat routes allow up to **120s** (`web/vercel.json`).

### Quick path — Fly.io (whole monorepo + knowledge pack)

```bash
fly auth login
fly apps create <your-app-name>   # then set app name in fly.toml
fly secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini CHAT_PASSWORD=changeme
fly deploy
```

See [`hosting.md`](hosting.md) for Railway and VPS. Live `get_market_price` / `get_patch_notes_latest` work on any deploy; day-over-day diffs need the `*_CHANGES_URL` env vars (or local `data/` files on repo-root hosts).

## Slash commands

Type **`/list`** in the chat for the full catalog (web slashes, Cursor commands, CLI). Common web ones:

| Command | Result |
| --- | --- |
| `/list` | Show available commands |
| `/fissures [sp] [tier]` | Live fissures |
| `/cycles` / `/sortie` / `/alerts` / `/invasions` | Live worldstate slices |
| `/market <slug>` | Live Warframe.market price |
| `/wfm <item>` | In-game max-rank sellers + whisper panel (or use the Orbiter **/wfm** tab) |
| `/market-changes` | Daily 4pm Pacific market scrape |
| `/list` / `/help` | Command catalog |
| `/model` | Active LLM model id for this session |
| `/patches` / `/hotfix` | Latest official updates/hotfixes (hub listing) |
| `/patch [version]` | Full official patch-note text |
| `/patch-changes` | Daily 4pm Pacific newly listed notes |
| `/arbitration` | Live Arbitration mission + timer |
| `/darvo` | Darvo daily deals |
| `/construction` | Fomorian / Razorback progress |
| `/relic <query>` | Relic refinement odds + tips |
| `/ehp` / `/forma` | Offline EHP / Forma heuristics |
| `/inventory <list>` | Parse owned gear (heuristic) |
| `/farm-vs-buy <item>` | Farm route + market tips |
| `/explain <topic>` | Mechanics stub → `/knowledge` |
| `/optimize <mode>` | Mission loadout tips stub |
| `/profile` | Player profile stub (CLI for now) |
| `/knowledge <query>` | Offline knowledge pack lookup (no LLM) |
| `/compare <item> \| mods…` | Compare a pasted loadout to top 3 local Overframe builds |
| `/dps <weapon> [vs <weaponB>] [--preset …]` | Offline modded DPS estimate / A vs B compare |

**Screenshot compare:** use **Attach** in the composer, then Send. With a vision model configured, the agent reads item/mods/arcanes from the image. Tool-capable vision models (e.g. `gpt-4o`) may call `compare_loadout_to_overframe` directly. Models that reject tools (common Ollama tags: `gemma3:4b`, `llava`, `moondream`) are handled automatically: vision read **without tools**, then a local Overframe compare. In `CHAT_MODE=local`, tesseract OCR + the local pack do the same without a vision LLM.

**Modded DPS:** plain-language “Torid vs Ignis Wraith damage?” or `/dps Torid vs Ignis Wraith --preset typical` uses the offline calculator (no live search).

Slash commands are handled without the LLM when possible (faster / cheaper). Plain-language questions use the model + tools when configured, otherwise the local chatbot.

Full shared catalog: [`docs/commands.md`](commands.md). Cursor cleanup modes: [`docs/cleanup-agent.md`](cleanup-agent.md) (`/cleanup-simplify`, `/cleanup-simplify -all`).

## What the chat can tool-call

- Worldstate summary, fissures, cycles, sortie, invasions, alerts, **arbitration**, **Darvo deals**, **construction progress**
- Warframe.market v2 price by slug (`get_market_price`)
- In-game sellers + `/w` whisper copy (`lookup_market_sellers` / `/wfm`) — Orbiter **/wfm** tab or chat command opens the Market Quotes search pane
- Latest saved daily market changes (4pm Pacific job)
- Latest official updates/hotfixes (live hub scrape)
- Newly listed patch notes since the previous daily snapshot (4pm Pacific job)
- Offline knowledge lookup (`lookup_local_knowledge`) — items, mechanics digests, arcane digests, Overframe builds
- Loadout vs top-3 Overframe compare (`compare_loadout_to_overframe`)
- Offline modded DPS / A vs B (`estimate_modded_dps`)
- **EHP estimate** (`estimate_ehp`), **Forma plan** (`plan_forma`), **relic odds** (`lookup_relic`), **inventory parse** (`parse_inventory`), **farm vs buy** (`farm_vs_buy`)

## Security notes

- Keep `OPENAI_API_KEY` server-side only (never in client code).
- For a personal phone shortcut, set `CHAT_PASSWORD` so random visitors can’t spend your API credits.
- This is a lightweight personal relay, not a full multi-user auth system.
