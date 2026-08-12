---
name: agent-reach
description: >
  General web/social/video research via Agent Reach (Jina, Exa, YouTube/yt-dlp,
  GitHub/gh, Reddit, Twitter/X, RSS, Bilibili, and other routed backends).
  Use for non-Warframe research and for opted-in online community lookup.
version: 0.1.1
metadata:
  hermes:
    tags: [Research, Web, YouTube, Reddit, Twitter, GitHub, AgentReach]
    category: research
---

# Agent Reach — general internet research

## When to use

- Operator wants general research, link reading, YouTube/Reddit/Twitter/GitHub/web search
- Operator shares a URL and wants a summary with sources
- Hybrid Warframe questions that need **online** community material after Online opt-in (WebUI Online search toggle, or Operator said “search online” in Hermes) — never ask yes/no

## When not to use

- Pure Warframe pack facts (mechanics/arcanes/catalog/DPS) → use `skills/warframe/*` + `npm run knowledge`
- Writing essays without fetching (this skill **fetches**)
- Posting / liking / commenting / automating logins

## Preconditions

1. Agent Reach CLI available: `agent-reach doctor` (or `doctor --json`)
2. If missing, follow profile `AGENT_REACH.md` / upstream install guide — **ask before `--system`**
3. Never install Agent Reach files into the Warframe-Build-Agent workspace; use `~/.agent-reach/` and `/tmp/`

## Standing rules

1. For multi-backend / login-backed platforms, check `agent-reach doctor --json` and use a working `active_backend`.
2. Announce: “using Agent Reach — platform X via backend Y”.
3. Cite URLs / tools. Do not invent social content.
4. Prefer zero-config channels first (web / YouTube / GitHub / RSS / Exa / Bilibili basic).
5. For Warframe build searches online: honor `ONLINE_SEARCH_CONFIRMATION_REQUIRED` and the **Online search** toggle (crawl when on; stay local when off). Never invent video URLs.

## Zero-config quick commands

```bash
# Channel health
agent-reach doctor
agent-reach doctor --json

# Read any web page → Markdown
curl -s "https://r.jina.ai/URL"

# Exa semantic search (when mcporter/Exa configured)
mcporter call exa.web_search_exa query="query" numResults=5

# GitHub
gh search repos "query" --sort stars --limit 10
gh repo view owner/repo

# YouTube metadata / subtitles (not for Bilibili)
yt-dlp --dump-json "URL"
yt-dlp --write-sub --write-auto-sub --skip-download -o "/tmp/%(id)s" "URL"

# RSS
python3 -c "import feedparser; print(feedparser.parse('FEED_URL').feed.title)"
```

## Login-backed platforms (optional)

Only after the Operator configured cookies / OpenCLI:

```bash
# Twitter (env must provide tokens for direct CLI)
twitter search "query" -n 10

# Reddit (desktop OpenCLI or rdt-cli)
opencli reddit search "query" -f yaml

# Facebook / Instagram (desktop OpenCLI)
opencli facebook search "query" -f yaml
opencli instagram user USERNAME -f yaml
```

## Install / repair

Upstream (authoritative):  
https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md

Profile notes: `AGENT_REACH.md`

```bash
agent-reach install --env=auto              # check only
# After explicit Operator approval:
agent-reach install --env=auto --system
agent-reach doctor
```

## Output shape

- Short answer
- Sources (bullets with URLs)
- What was fetched (tool/backend)
- Caveats (login wall, region, stale)
- Optional next research step
