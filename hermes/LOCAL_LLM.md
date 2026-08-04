# Local LLM setup (Hermes + Ollama / Qwen)

Use a **local** OpenAI-compatible model so Ordis runs on your machine.  
Facts still come from this repo’s offline pack and CLIs — not from the model inventing Warframe stats.

**New to Hermes?** Follow the full import guide first:  
→ [`docs/hermes-export.md`](../docs/hermes-export.md)

---

## Checklist

1. This repo is on your computer and you ran `npm install`  
2. `npm run knowledge -- status` works  
3. Hermes profile **warframe-build-agent** is imported and active  
4. Hermes **working directory** points at this repo root  
5. A local server (Ollama / LM Studio / …) is running  
6. Hermes provider points at that server  

---

## Ollama (recommended)

### 1. Install Ollama

Download: https://ollama.com  

### 2. Download a chat model

```bash
ollama pull qwen2.5
```

Other fine options: `qwen3.6`, `qwen2.5:14b`, etc. **Use the same name** in Hermes.

### 3. Configure Hermes

| Setting | Value |
| --- | --- |
| Provider | OpenAI-compatible |
| Base URL | `http://127.0.0.1:11434/v1` |
| API key | `ollama` (any non-empty text is OK) |
| Model | `qwen2.5` |

If your Hermes build uses a profile `.env` file:

```bash
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_MODEL=qwen2.5
```

### 4. Test

In Hermes chat:

> Lookup Arcane Energize from the local knowledge pack.

---

## LM Studio / vLLM

1. Start the local server in that app.  
2. Copy its OpenAI-compatible Base URL (LM Studio is often `http://127.0.0.1:1234/v1`).  
3. Paste Base URL + model id into Hermes.  
4. API key can be any placeholder if the server does not require one.

---

## Commands Ordis should prefer

With Hermes cwd = this repo:

| Goal | Command |
| --- | --- |
| Pack health | `npm run knowledge -- status` |
| Item / mechanics / arcanes | `npm run knowledge -- lookup "<query>"` |
| Loadout vs Overframe | `npm run knowledge -- compare-loadout "<item>" --mods "..." [--arcanes "..."]` |
| Modded DPS | `npm run knowledge -- dps "<weapon>" --preset typical` |
| DPS A vs B | `npm run knowledge -- compare-dps "<A>" "<B>" --preset typical` |
| Live world-state | `npm run wf -- summary` |
| Market | `npm run market -- price <slug>` |
| Patches | `npm run patches -- latest` |

Refresh pack pieces:

```bash
npm run knowledge -- pull --skip-overframe
npm run knowledge -- pull-mechanics
npm run knowledge -- pull-arcanes
```

Overframe builds (may need a browser/home network): see [`docs/overframe-crawl.md`](../docs/overframe-crawl.md).

---

## Same model in the web UI

You do **not** have to edit files. Run `npm run web:dev`, open http://localhost:3000, tap **LLM / Ollama**, and enter the same Base URL / key / model.

Or use `web/.env.local`:

```bash
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5
```

`CHAT_MODE=local` = deterministic knowledge chatbot with **no** LLM.

Details: [`docs/web-chat.md`](../docs/web-chat.md).

---

## Troubleshooting

| Issue | Try this |
| --- | --- |
| Connection refused | Is Ollama running? Is the Base URL exactly `…/v1`? |
| Wrong / empty answers | Is Hermes cwd the repo root? Run `npm run knowledge -- status` |
| Model not found | `ollama list` — model name must match Hermes |
| Still inventing builds | Overframe cache may be empty — import builds or allow online search when Ordis asks |
