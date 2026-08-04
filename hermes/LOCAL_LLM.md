# Local LLM setup (Hermes + Qwen / OpenAI-compatible)

Use this profile with a **local** OpenAI-compatible model (Qwen 3.6, Qwen2.5, Llama, etc.). Facts come from the repo’s offline pack + CLIs — not from the model’s training data.

## Recommended stack

1. **Clone this repo** (needs `data/knowledge/` + Node CLIs)
2. **Install deps** at repo root: `npm install`
3. **Confirm pack:** `npm run knowledge -- status`
4. **Run a local OpenAI-compatible server** (examples below)
5. **Import Hermes profile** and point `terminal.cwd` at the repo root
6. **Configure Hermes model provider** to that local endpoint

## Example: Ollama (Qwen)

```bash
# Install / pull a chat model (name may vary by release)
ollama pull qwen3.6
# or: ollama pull qwen2.5:14b

# Ollama exposes OpenAI-compatible API at http://127.0.0.1:11434/v1
```

In Hermes profile config / UI (provider names vary by Hermes version):

```yaml
model:
  provider: openai
  name: qwen3.6          # must match the Ollama tag
  # base_url / api_base: http://127.0.0.1:11434/v1
```

Profile `.env` (typical):

```bash
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
# If Hermes uses different env names, map them in the Desktop provider UI.
```

## Example: LM Studio / vLLM

Point Hermes at the local OpenAI-compatible base URL (often `http://127.0.0.1:1234/v1` for LM Studio) and set the model id shown in that app.

## What Ordis should use locally

With `terminal.cwd` = repo root, prefer shell tools over inventing numbers:

| Goal | Command |
| --- | --- |
| Pack health | `npm run knowledge -- status` |
| Item / mechanics / arcanes | `npm run knowledge -- lookup "<query>"` |
| Loadout vs Overframe top builds | `npm run knowledge -- compare-loadout "<item>" --mods "..." [--arcanes "..."]` |
| Modded DPS | `npm run knowledge -- dps "<weapon>" --preset typical` |
| DPS A vs B | `npm run knowledge -- compare-dps "<A>" "<B>" --preset typical` |
| Refresh mechanics | `npm run knowledge -- pull-mechanics` |
| Refresh arcanes | `npm run knowledge -- pull-arcanes` |
| Refresh Overframe builds | `npm run knowledge -- crawl-overframe` (residential IP) |
| Live world-state | `npm run wf -- summary` |
| Market | `npm run market -- price <slug>` |
| Patches | `npm run patches -- latest` |

## Pack refresh / sidecar

If `data/knowledge/` is missing or stale:

```bash
npm run knowledge -- pull --skip-overframe   # catalog + wiki + mechanics + arcanes
npm run knowledge -- pull-mechanics
npm run knowledge -- pull-arcanes
# Overframe (often Cloudflare-blocked on cloud IPs):
npm run knowledge -- crawl-overframe
# or:
./scripts/pack-knowledge-sidecar.sh   # optional tarball of data/knowledge/
```

## Web UI alternative

Same local model works in `web/`:

```bash
cd web
cp .env.example .env.local
# OPENAI_BASE_URL=http://127.0.0.1:11434/v1
# OPENAI_API_KEY=ollama
# OPENAI_MODEL=qwen3.6
npm run dev
```

Or set `CHAT_MODE=local` for a deterministic no-LLM chatbot over the same pack.
