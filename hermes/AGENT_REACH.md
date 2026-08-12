# Agent Reach on this Hermes profile

This Hermes profile is **not Warframe-only**. Warframe skills stay available; **Agent Reach** unlocks general web / social / video research.

Upstream project: https://github.com/Panniantong/Agent-Reach  
English overview: https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/docs/README_en.md

## What you get

| Mode | Skills |
| --- | --- |
| Warframe | `skills/warframe/*` + optional repo CLIs |
| General research | `skills/research/agent-reach` → Agent Reach CLIs (Jina, yt-dlp, gh, Exa, Reddit/Twitter backends, …) |

Agent Reach is a **capability router** (install + doctor + backend selection). Your Agent calls upstream tools directly; it is not a wrapper API.

## Install (on the machine that runs Hermes)

Tell Hermes / paste to the Agent:

```text
Install Agent Reach for this profile using:
https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md

Stay inside Agent Reach boundaries:
- Prefer check-only first: agent-reach install --env=auto
- Only use --system after I explicitly approve system installs
- Keep files under ~/.agent-reach/ and /tmp/ — do not write into the Warframe-Build-Agent repo
- Then run: agent-reach doctor
```

Manual (human) sketch:

```bash
# Recommended
pipx install https://github.com/Panniantong/Agent-Reach/archive/main.zip
agent-reach install --env=auto                 # read-only check
# After you approve:
agent-reach install --env=auto --system        # core zero-config channels
agent-reach doctor
```

Optional channels (Twitter cookies, Reddit/OpenCLI, etc.) are **opt-in** — ask Hermes to install only what you need (`--channels=…`) after approving `--system`.

Also install the Agent Reach skill into Hermes if your Hermes version supports skills from npm/skills hubs:

```bash
npx skills add Panniantong/Agent-Reach@agent-reach
```

This repo already ships a Hermes-local skill at `skills/research/agent-reach/` so the profile works even before that global skill is installed.

## After install — try

```bash
agent-reach doctor
curl -s "https://r.jina.ai/https://example.com" | head
gh search repos "warframe" --limit 5
yt-dlp --dump-json "https://www.youtube.com/watch?v=dQw4w9WgXcQ" | head -c 400
```

In Hermes chat:

- “Research current AI agent frameworks and summarize with sources”
- “What are people saying on Reddit about Steel Path ammo economy?” (needs Reddit channel)
- “Pull subtitles / outline from this YouTube URL: …”

## Warframe + research together

1. Local pack first for facts/builds (`npm run knowledge -- lookup …`).
2. If local Overframe builds are missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`): crawl only when Online is opted in (WebUI **Online search** toggle, or Operator said “search online” in Hermes). Never ask yes/no. Do not invent video URLs.
3. Use Agent Reach freely for clearly **non-Warframe** research; for Warframe community pulls (YouTube/Reddit/X), follow the same online opt-in rules as the Warframe skills / `community-search`.

## Privacy / safety

- Cookies stay local under `~/.agent-reach/` (never commit them).
- Prefer secondary accounts for cookie-backed platforms.
- No posting/liking/comment automation — read/search only.
- Do not bypass Cloudflare or site protections; Agent Reach does not replace the Overframe browser-extract workflow in `docs/overframe-crawl.md`.
