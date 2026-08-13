# Import Warframe Build Agent into Hermes Desktop

This guide is for **anyone** — even if you have never used a terminal much.  
Follow the steps in order. When you finish, Hermes Desktop will chat as **Ordis** (Warframe Build Agent) using your own computer’s files and (optionally) a local AI like Ollama.

---

## What you will have when done

- Hermes Desktop with the **warframe-build-agent** profile  
- Ordis as a **Cursor-class general AI agent** (tools, reasoning, delivery) with Warframe specialty  
- Access to this repo’s **offline knowledge pack** (Wiki digests, arcanes, mechanics, Overframe builds when available)  
- Optional: **always-online research** via [Agent Reach](https://github.com/Panniantong/Agent-Reach)  
- Full agent skill pack — see [`../hermes/CODING.md`](../hermes/CODING.md)

**Time:** about 15–30 minutes the first time (plus a few minutes if you install Agent Reach).

---

## Before you start (checklist)

You need:

1. **This project on your computer**  
   Folder name: `Warframe-Build-Agent`  
   GitHub: https://github.com/henrywguan/Warframe-Build-Agent

2. **Node.js 20 or newer**  
   Check: open a terminal and run `node -v`  
   If that fails, install from https://nodejs.org (LTS).

3. **Hermes Desktop** (or Hermes CLI)  
   Install Hermes from the official Hermes site / docs for your OS.  
   This profile expects Hermes **0.12.0 or newer**.

4. *(Optional but recommended)* **Ollama** for a free local AI  
   https://ollama.com — so you do not need a paid OpenAI key.

---

## Step 1 — Get the project

### Option A — Download ZIP (simplest)

1. Open https://github.com/henrywguan/Warframe-Build-Agent  
2. Click the green **Code** button → **Download ZIP**  
3. Unzip it somewhere easy to find, for example:  
   `Documents\Warframe-Build-Agent`  
4. Remember this full folder path. You will need it in Step 5.

### Option B — Git clone

```bash
git clone https://github.com/henrywguan/Warframe-Build-Agent.git
cd Warframe-Build-Agent
```

---

## Step 2 — Install project tools

Open a terminal **in the project folder** (the folder that contains `package.json`).

**Windows (PowerShell):**

```powershell
cd "C:\path\to\Warframe-Build-Agent"
npm install
```

**Mac / Linux:**

```bash
cd /path/to/Warframe-Build-Agent
npm install
```

Wait until it finishes with no errors.

---

## Step 3 — Check the offline knowledge pack

Still in the project folder:

```bash
npm run knowledge -- status
```

You should see JSON with counts such as `catalogItems`, `wikiDigests`, `arcaneDigests`, `mechanicsDigests`.

If the pack looks empty or missing, refresh the safe parts (no Overframe crawl required):

```bash
npm run knowledge -- pull --skip-overframe
npm run knowledge -- pull-mechanics
npm run knowledge -- pull-arcanes
```

Overframe top builds often need a home network / browser export — see [`overframe-crawl.md`](overframe-crawl.md). Hermes still works without a full Overframe crawl; build advice will lean on wiki facts + agent calculation until builds are imported.

---

## Step 4 — Create the Hermes profile file

Still in the project folder.

### Windows (Git Bash or WSL)

If you have Git for Windows, open **Git Bash** in the project folder:

```bash
./scripts/pack-hermes-profile.sh
```

### Mac / Linux

```bash
./scripts/pack-hermes-profile.sh
```

### If the script will not run on Windows

You can skip packing and import the `hermes` folder directly in Step 5 (Option B).

When packing works, you get this file:

`exports/warframe-build-agent-hermes-profile.tar.gz`

---

## Step 5 — Import into Hermes Desktop

### Option A — Desktop UI (recommended for most people)

1. Open **Hermes Desktop**.  
2. Go to **Profiles** (wording may be “Profiles”, “Manage profiles”, or similar).  
3. Choose **Import**.  
4. Select:  
   `Warframe-Build-Agent\exports\warframe-build-agent-hermes-profile.tar.gz`  
5. Name the profile: `warframe-build-agent`  
6. Activate / **Use** that profile.

### Option B — Import the `hermes` folder (no pack script)

In a terminal (Hermes CLI installed and on your PATH):

```bash
cd /path/to/Warframe-Build-Agent
hermes profile install ./hermes --name warframe-build-agent --alias
hermes profile use warframe-build-agent
```

### Option C — Import the `.tar.gz` with CLI

```bash
cd /path/to/Warframe-Build-Agent
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
hermes profile use warframe-build-agent
```

---

## Step 6 — Point Hermes at this project folder (important)

Ordis needs to run commands like `npm run knowledge -- lookup …` inside **this** repo.

1. Open the **warframe-build-agent** profile settings in Hermes.  
2. Find **terminal working directory** / **cwd** / **project folder** (label varies by Hermes version).  
3. Set it to the **full path** of your `Warframe-Build-Agent` folder  
   (the folder that contains `package.json` and `data/knowledge/`).  
4. Save.

If this step is skipped, live lookups and the offline pack will not work reliably.

---

## Step 7 — Connect a model (Ollama recommended)

### 7a — Install and pull a model (Ollama)

1. Install Ollama from https://ollama.com  
2. Open a terminal and run:

```bash
ollama pull qwen2.5
```

(You can use another tag such as `qwen3.6` if you prefer — just use the **same name** in Hermes.)

3. Leave Ollama running in the background (it usually starts with the app).

### 7b — Tell Hermes to use Ollama

In Hermes profile / provider settings, choose an **OpenAI-compatible** provider and set:

| Setting | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:11434/v1` |
| API key | `ollama` (any non-empty string is fine) |
| Model | `qwen2.5` (must match what you pulled) |

If Hermes uses a profile `.env` file instead of a form, put:

```bash
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_MODEL=qwen2.5
```

More detail: [`../hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md).

### 7c — Or use OpenAI / another cloud provider

Set your real `OPENAI_API_KEY` in Hermes. You can leave Base URL empty for official OpenAI.

---

## Step 8 — Verify it works

### In a terminal (project folder)

```bash
npm run knowledge -- status
npm run knowledge -- lookup "Arcane Energize"
```

### In Hermes

Start a chat with the **warframe-build-agent** profile and ask:

> Lookup Arcane Energize from the local knowledge pack.

Or:

> Compare Torid vs Ignis Wraith DPS with a typical preset.

You should get answers grounded in local data, not only the model’s memory.

Optional CLI check:

```bash
hermes -p warframe-build-agent skills list
```

You should see skills such as `offline-knowledge`, `loadout-compare`, `modded-dps`, `recommend-build`, `world-state`, and `agent-reach`.

---

## Cursor-class agent tools (recommended)

For full Cursor-like power, enable in Hermes Desktop/CLI:

1. **Filesystem** (read/write/patch)  
2. **Terminal**  
3. **Web** search/extract (or Agent Reach)  
4. **Browser** (UI verification)  
5. **Vision** (screenshots/diagrams)  
6. **MCP** servers you use  
7. **Subagents / delegate** if available  

Then try: *“Act as a full Cursor agent — explore the knowledge CLI, run a verifying command, summarize with evidence.”*  

Constitution + skill map: [`../hermes/CODING.md`](../hermes/CODING.md).

Point cwd at **this repo** for Warframe CLIs, or **any project** for general agent work.

---

## Online community search in Hermes (always on)

Web chat uses an **Online search** toggle. **Hermes is always online** — no toggle, and never ask yes/no.

When local Overframe builds are missing, Ordis crawls community / web sources immediately (Agent Reach, Jina page reads, Overframe paths). Local pack still comes first when it has the answer. If a crawl fails (e.g. Cloudflare), Ordis falls back to agent-calculated + pack facts.

Screenshot/OCR Attach is web-chat only — in Hermes, paste mod names for `compare-loadout`.

---

## Step 9 — Optional: Agent Reach (general web research)

The Hermes profile is **not limited to Warframe**. To use Ordis as a general AI web research tool (YouTube, Reddit, GitHub, web pages, etc.), install [Agent Reach](https://github.com/Panniantong/Agent-Reach) on the **same machine** as Hermes.

Full guide: [`../hermes/AGENT_REACH.md`](../hermes/AGENT_REACH.md).

Short version:

```bash
pipx install https://github.com/Panniantong/Agent-Reach/archive/main.zip
agent-reach install --env=auto                 # check-only first
# Only after you approve system packages:
agent-reach install --env=auto --system
agent-reach doctor
```

Then in Hermes chat try:

> Research current AI agent frameworks and summarize with sources

Keep Agent Reach files under `~/.agent-reach/` — do not install into this repo’s `data/` tree. Do not run `--system` without approving it.

---

## What Ordis can do after import

| You ask about… | What happens |
| --- | --- |
| Item / Warframe / weapon facts | Local wiki + catalog pack |
| Mechanics (viral, corrosive, armor…) | Local mechanics digests |
| Arcanes | Local arcane digests |
| “My loadout vs Overframe” | Local Overframe builds when present |
| Modded DPS / A vs B | Offline calculator |
| Fissures / cycles / sortie | Live Warframe Status CLI |
| Prices | Warframe.market CLI |
| Hotfixes / updates | Official patch-notes CLI |
| General web / YouTube / Reddit / GitHub research | Agent Reach (after Step 9) |

Builds follow the source policy: **local Overframe cache first**, then Online search toggle / consent rules for open-web community pulls. See [`source-policy.md`](source-policy.md).

---

## Common problems

| Problem | Fix |
| --- | --- |
| `npm` not found | Install Node.js LTS; open a **new** terminal |
| `hermes` not found | Install Hermes CLI or use Desktop **Import** only |
| Pack script fails on Windows | Use Step 5 Option B (`hermes profile install ./hermes …`) |
| Lookups invent stats | Set profile **cwd** to the repo root (Step 6) |
| Cannot reach Ollama | Confirm Ollama is running; Base URL must end with `/v1` |
| Cloudflare / empty Overframe builds | Normal on some networks — use [`overframe-crawl.md`](overframe-crawl.md) browser export |
| PowerShell blocks `npm` | Use `npm.cmd`, or set CurrentUser execution policy to `RemoteSigned` |

---

## Optional extras

### Pack knowledge with the profile

```bash
./scripts/pack-hermes-profile.sh --with-knowledge
```

Still keep a normal repo checkout for day-to-day CLI use.

### Same brain in the phone/web UI

```bash
npm run web:dev
```

Then open http://localhost:3000 and tap **LLM / Ollama** to point at the same local model. Details: [`web-chat.md`](web-chat.md).

### Desktop arsenal overlay

Separate window for in-game coaching — [`overlay.md`](overlay.md). Not required for Hermes.

### Agent Reach (general research)

See Step 9 and [`../hermes/AGENT_REACH.md`](../hermes/AGENT_REACH.md).

---

## Quick copy-paste summary

```bash
git clone https://github.com/henrywguan/Warframe-Build-Agent.git
cd Warframe-Build-Agent
npm install
npm run knowledge -- status
./scripts/pack-hermes-profile.sh
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
hermes profile use warframe-build-agent
# Set Hermes cwd = this folder
# Set Hermes model = Ollama http://127.0.0.1:11434/v1  key=ollama  model=qwen2.5
```

---

## Related docs

- Local model detail: [`../hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md)  
- Agent Reach: [`../hermes/AGENT_REACH.md`](../hermes/AGENT_REACH.md)  
- Profile folder notes: [`../hermes/README.md`](../hermes/README.md)  
- Offline pack: [`offline-knowledge.md`](offline-knowledge.md)  
- Getting started hub: [`getting-started.md`](getting-started.md)
