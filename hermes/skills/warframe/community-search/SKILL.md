---
name: community-search
description: >
  Always-on live community build / web corroboration for Hermes (stand-in for
  webchat search_community_builds + search_web + fetch_web_page). Prefer local
  pack first, then crawl without asking yes/no.
version: 0.2.0
metadata:
  hermes:
    tags: [Warframe, Overframe, YouTube, Web, Builds]
    category: warframe
    related_skills: [recommend-build, offline-knowledge, agent-reach, overframe-import]
---

# Community / web search (Hermes always online)

## When to use

- Local Overframe builds missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`)
- Operator asks to widen a comparison with Overframe / YouTube / web
- Need to read a specific public page (wiki, guide, creator notes)
- Pack facts are thin and a public page would settle the answer

## When not to use

- Pack already answers cleanly — skip the crawl
- Never invent video URLs or “I watched this” without a fetch

## Hermes vs web chat

| Surface | Online behavior |
| --- | --- |
| **Hermes Desktop** | **Always online** — crawl when needed; never ask yes/no; no toggle |
| Web chat | **Online search** toggle gates live community crawl |

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
