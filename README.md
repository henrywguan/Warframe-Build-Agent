# Warframe Build Agent

**Ordis** — a Warframe advisor for builds, gear compares, mechanics, live world-state, market prices, and patch notes.

Works in **Hermes Desktop**, a **mobile web chat**, Cursor, and simple **terminal commands**. Answers prefer a local offline knowledge pack (Wiki digests, arcanes, mechanics, Overframe builds) instead of inventing stats.

---

## New here? Start with these

| Goal | Guide |
| --- | --- |
| **First-time setup** | [`docs/getting-started.md`](docs/getting-started.md) |
| **Import into Hermes Desktop** (step-by-step for everyone) | [`docs/hermes-export.md`](docs/hermes-export.md) |
| **All documentation** | [`docs/README.md`](docs/README.md) |

---

## What you can do

- Compare weapons / Warframes and recommend budget → Steel Path builds  
- Explain damage types, status, armor, arcanes, and other systems  
- Compare a pasted or screenshotted loadout to cached Overframe builds  
- Estimate offline modded DPS (including A vs B)  
- Check fissures, cycles, sortie, market prices, and official hotfixes  

Default platform: **PC** (cross-play worldstate; same path used for mobile).

---

## Quick install

**Need:** [Node.js 20+](https://nodejs.org)

```bash
git clone https://github.com/henrywguan/Warframe-Build-Agent.git
cd Warframe-Build-Agent
npm install
npm run knowledge -- status
```

---

## Three ways to use it

### 1) Hermes Desktop (recommended for desktop chat)

Full beginner walkthrough → **[`docs/hermes-export.md`](docs/hermes-export.md)**

Short version:

```bash
./scripts/pack-hermes-profile.sh
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
```

Then in Hermes:

1. Activate profile **warframe-build-agent**  
2. Set the profile working folder to this repo  
3. Connect **Ollama** (`http://127.0.0.1:11434/v1`, key `ollama`) or OpenAI  

Local model notes: [`hermes/LOCAL_LLM.md`](hermes/LOCAL_LLM.md)

### 2) Web / phone chat

```bash
npm run web:dev
```

Open http://localhost:3000  

Tap **LLM / Ollama** to set Base URL and API key in the browser (no `.env` editing required).  
Phone on home Wi‑Fi: `npm run web:dev:lan` or `npm run web:build && npm run web:start:lan` — see [`docs/web-chat.md`](docs/web-chat.md#use-from-another-device-on-your-home-wi-fi-lan).

### 3) Terminal

```bash
npm run wf -- summary
npm run market -- price mirage_prime_set
npm run patches -- latest
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
```

Type **`/list`** in any chat UI for the full command catalog → [`docs/commands.md`](docs/commands.md)

---

## Offline knowledge pack

| Content | Refresh |
| --- | --- |
| Catalog + wiki | `npm run knowledge -- pull --skip-overframe` |
| Mechanics | `npm run knowledge -- pull-mechanics` |
| Arcanes | `npm run knowledge -- pull-arcanes` |
| Overframe top builds | `npm run knowledge -- crawl-overframe` (or browser export — [`docs/overframe-crawl.md`](docs/overframe-crawl.md)) |

Policy: local builds first; ask before online search → [`docs/source-policy.md`](docs/source-policy.md)

---

## Desktop arsenal overlay (optional)

External always-on-top coaching window (no reading/writing Warframe memory).  
Guide: [`docs/overlay.md`](docs/overlay.md)

```bash
cd overlay
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 -m wf_overlay
```

---

## Daily scrapes

Market and patch-note snapshots refresh around **4:00 PM Pacific** via GitHub Actions into `data/market/` and `data/patches/`.

---

## Project map

| Path | Role |
| --- | --- |
| [`docs/`](docs/) | Human guides (start at [`docs/README.md`](docs/README.md)) |
| [`hermes/`](hermes/) | Hermes profile (SOUL + skills) |
| [`web/`](web/) | Mobile-friendly chat UI |
| [`overlay/`](overlay/) | Desktop arsenal overlay |
| [`src/`](src/) | Status / Market / Patches / Knowledge CLIs |
| [`data/knowledge/`](data/knowledge/) | Offline pack |
| [`AGENTS.md`](AGENTS.md) | Notes for coding agents |

---

## Scripts (common)

| Command | Purpose |
| --- | --- |
| `npm run wf -- <cmd>` | Live world-state |
| `npm run market -- <cmd>` | Warframe.market |
| `npm run patches -- <cmd>` | Official updates / hotfixes |
| `npm run knowledge -- …` | Offline pack pull / lookup / DPS / loadout compare |
| `npm run web:dev` | Web chat (localhost) |
| `npm run web:dev:lan` | Web chat bound for home Wi‑Fi devices |
| `npm run web:start:lan` | Production web chat on LAN (after `web:build`) |
| `npm run web:tunnel` | Temporary HTTPS Cloudflare Quick Tunnel (`trycloudflare.com`) |
| `./scripts/pack-hermes-profile.sh` | Pack Hermes `.tar.gz` for Desktop import |
| `npm test` | Unit tests |

---

## Source notes

Market prices, patch listings, and live timers change. When sources disagree, see [`docs/sources.md`](docs/sources.md).
