---
name: community-search
description: >
  Opted-in live community build / web corroboration (Hermes stand-in for webchat
  search_community_builds + search_web + fetch_web_page). Use only when Online is
  opted in or the Operator asked to search the open web.
version: 0.1.0
metadata:
  hermes:
    tags: [Warframe, Overframe, YouTube, Web, Builds]
    category: warframe
    related_skills: [recommend-build, offline-knowledge, agent-reach, overframe-import]
---

# Community / web search (opt-in)

## When to use

- Local Overframe builds missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`) **and** Online is opted in
- Operator explicitly asks to widen a comparison with Overframe / YouTube / web
- Need to read a specific public page (wiki, guide, creator notes)

## When not to use

- Pack can answer facts/mechanics/arcanes/DPS — use `offline-knowledge` / knowledge CLIs
- Online not opted in — stay local + agent-calculated; tell them how to opt in
- Never invent video URLs or “I watched this” without a fetch

## Opt-in (never ask yes/no)

| Surface | Opted in when |
| --- | --- |
| Web chat | **Online search** toggle ON |
| Hermes Desktop | Operator said “search online”, “crawl Overframe/YouTube”, or clearly asked for live community results |

## Procedure

1. Announce that you are using a live community / web fetch.
2. Prefer repo tools when cwd is this checkout:
   - Cached import path: `npm run knowledge -- builds "<item>"`
   - Overframe crawl / HTML import: see `overframe-import` skill + `docs/overframe-crawl.md` (no CF bypass)
3. Page read (Hermes stand-in for `fetch_web_page`):
   - `curl -s "https://r.jina.ai/URL"`
4. Broader web / YouTube / Reddit (when Agent Reach is installed):
   - Follow `skills/research/agent-reach`
   - YouTube metadata: `yt-dlp --dump-json "URL"`
5. Cite every URL returned. Prefer Wiki + Overframe + official pages over random blogs.
6. If crawls fail (Cloudflare, empty results), say so and fall back to agent-calculated + pack facts.

## Output shape

- What was searched (platforms)
- Top cited links (real URLs only)
- How they affect the recommendation
- Caveat (timing, CF, region)
- Next step
