# Getting started

Welcome. This project is a **Warframe Build Agent** (Ordis) that helps with builds, comparisons, mechanics, live world-state, market prices, and patch notes.

Pick the path that matches how you want to use it.

---

## Choose your path

| I want to… | Go here |
| --- | --- |
| **Import into Hermes Desktop** (chat as Ordis on your PC) | **[Hermes import — step by step](hermes-export.md)** ← start here if you are new |
| **Use the phone/web chat** in a browser | [Web chat](web-chat.md) |
| **Host a public URL with OpenAI** | [Hosting](hosting.md) (Vercel / Fly / VPS) |
| **Use commands in a terminal** | Sections below + [Command list](commands.md) |
| **Use the desktop arsenal overlay** | [Overlay](overlay.md) |
| **Fill / refresh the offline knowledge pack** | [Offline knowledge](offline-knowledge.md) |

---

## 5-minute setup (any path)

1. Install **Node.js 20+** from https://nodejs.org  
2. Download or clone this repo: https://github.com/henrywguan/Warframe-Build-Agent  
3. In the project folder run:

```bash
npm install
npm run knowledge -- status
```

4. Then continue with Hermes, Web, or CLI using the links above.

---

## What “offline knowledge pack” means

The agent can answer many questions **without inventing stats**, using files under `data/knowledge/`:

- Warframe / weapon catalog  
- Wiki digests  
- Mechanics digests (damage types, status, armor, …)  
- Arcane digests  
- Cached Overframe top builds (when available)

Refresh guide: [offline-knowledge.md](offline-knowledge.md).

---

## Hermes Desktop (short)

Full beginner guide: **[hermes-export.md](hermes-export.md)**.

Short version:

1. `npm install` in this repo  
2. Pack or install the `hermes/` profile  
3. Set Hermes **working folder** to this repo  
4. Connect Ollama (`http://127.0.0.1:11434/v1`, key `ollama`) or OpenAI  
5. Ask: “Lookup Arcane Energize from the local pack”

---

## Web chat (short)

```bash
npm run web:dev
```

Open http://localhost:3000  

Tap **LLM / Ollama** to paste your Base URL and key (no file editing required).

Redesigning the UI? Color / type / layout tokens → [web-chat-design.md](web-chat-design.md).

**Phone on home Wi‑Fi:** `npm run web:dev:lan` (dev + HMR) or `npm run web:build && npm run web:start:lan` (no whitelist needed). Details: [web-chat.md](web-chat.md#use-from-another-device-on-your-home-wi-fi-lan).

---

## Useful commands

```bash
npm run wf -- summary
npm run market -- price mirage_prime_set
npm run patches -- latest
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
```

Full catalog: [commands.md](commands.md) (also type `/list` in chat).

---

## Docs index

See [README.md](README.md) in this folder for the full documentation map.
