# Warframe Build Agent — Hermes profile

This folder is the **Hermes profile** (Ordis) you import into Hermes Desktop or CLI.

**Not a Hermes user yet?** Use the full beginner guide (recommended):

→ **[`docs/hermes-export.md`](../docs/hermes-export.md)** — precise step-by-step import for everyone.

**Profile version:** `0.5.0` (Hermes ≥ 0.12.0)  
Works with **local LLMs** (Ollama / Qwen / LM Studio) or cloud OpenAI-compatible APIs.  

Capabilities:

- **Warframe specialty** — pack + webchat-parity CLIs  
- **Always-online research** — [Agent Reach](https://github.com/Panniantong/Agent-Reach) (optional host install)  
- **Cursor-style coding agent** — `skills/software-development/*` + [`CODING.md`](CODING.md)

---

## Fast path (after you have this repo + `npm install`)

### Desktop

1. From the **repo root**, pack the profile:

```bash
./scripts/pack-hermes-profile.sh
```

2. In Hermes Desktop: **Profiles → Import** → choose  
   `exports/warframe-build-agent-hermes-profile.tar.gz`  
3. Name it `warframe-build-agent` and **activate** it.  
4. Set the profile **working directory** to the **Warframe-Build-Agent** folder (the one with `package.json`).  
5. Connect Ollama or OpenAI — see [`LOCAL_LLM.md`](LOCAL_LLM.md).

### CLI

```bash
# From Warframe-Build-Agent root:
hermes profile install ./hermes --name warframe-build-agent --alias
hermes profile use warframe-build-agent
```

Or import the packed archive:

```bash
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
```

---

## What’s inside

| Path | Role |
| --- | --- |
| `SOUL.md` | Ordis identity + Warframe / research / coding routing |
| `LOCAL_LLM.md` | Ollama / Qwen / LM Studio setup |
| `AGENT_REACH.md` | Install / doctor / boundaries for Agent Reach |
| `CODING.md` | Cursor-style coding agent guide |
| `skills/warframe/*` | Builds, loadout, DPS, world-state, market, patches, … |
| `skills/research/agent-reach/` | General web / social / video research |
| `skills/software-development/*` | Agent loop, explore, plan, implement, debug, test, git, PR, review, … |
| `distribution.yaml` | Hermes distribution manifest |
| `config.yaml` / `profile.yaml` | Light defaults |

---

## After import — must do

1. **Working folder = this repo root** (so `npm run knowledge` works).  
2. **Model provider** configured (Ollama example):

| Field | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:11434/v1` |
| API key | `ollama` |
| Model | `qwen2.5` (or whatever you pulled) |

3. Smoke test in Hermes chat:  
   `Lookup Arcane Energize from the local knowledge pack`
4. *(Optional)* Install Agent Reach for general research — see [`AGENT_REACH.md`](AGENT_REACH.md). Then try:  
   `Research current AI agent frameworks and summarize with sources`
5. Enable Hermes **filesystem + terminal (+ web)** tools so coding skills can edit and verify.  
   Smoke test: `Explore how npm run knowledge is wired, then summarize the entry files.`
6. For coding **other repos**, point the Hermes working directory at that project (Warframe CLIs need this repo).

---

## Coding agent (Cursor-style)

See [`CODING.md`](CODING.md). Core skills:

`agent-loop` · `codebase-explore` · `plan-task` · `implement-change` · `debug-issue` · `test-verify` · `git-workflow` · `pr-workflow` · `code-review` · `refactor-cleanup` · `shell-discipline` · `docs-sync`

Optional: keep Hermes’s own bundled software-development skills seeded too:

```bash
hermes skills opt-in --sync
```

---

## General research (Agent Reach)

On the **same machine** as Hermes (not inside this repo’s `data/` tree):

```bash
pipx install https://github.com/Panniantong/Agent-Reach/archive/main.zip
agent-reach install --env=auto          # check-only first
# After you approve system packages:
agent-reach install --env=auto --system
agent-reach doctor
```

Details and safety boundaries: [`AGENT_REACH.md`](AGENT_REACH.md).

---

## What is not in the lean profile archive

- Full `data/knowledge/` files — keep a normal checkout of this repo (or pack with `--with-knowledge`)  
- Web UI (`web/`) and overlay (`overlay/`) — optional extras  

---

## Operator commands Ordis should run

```bash
npm run knowledge -- status
npm run knowledge -- lookup "Primary Merciless"
npm run knowledge -- compare-loadout "Coda Hema" --mods "Serration,Split Chamber" --arcanes "Primary Merciless"
npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical
npm run knowledge -- ehp --health 700 --shields 300 --armor 300 --dr 0.5
npm run market -- slug-search "Arcane Energize"
npm run patches -- detail
npm run wf -- summary
npm run wf -- arbitration
```

---

## More help

- Beginner Hermes guide: [`docs/hermes-export.md`](../docs/hermes-export.md)  
- Coding agent: [`CODING.md`](CODING.md)  
- Agent Reach: [`AGENT_REACH.md`](AGENT_REACH.md) · https://github.com/Panniantong/Agent-Reach  
- Getting started hub: [`docs/getting-started.md`](../docs/getting-started.md)  
- Offline pack: [`docs/offline-knowledge.md`](../docs/offline-knowledge.md)
