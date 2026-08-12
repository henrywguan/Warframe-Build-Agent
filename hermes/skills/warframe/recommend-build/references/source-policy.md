# Source policy (Hermes)

**Local database first for build comparisons; online opt-in for live crawls — never ask the Operator to type yes/no.**

Same rules as `docs/source-policy.md` and the web chat **Online search** toggle.

## Facts

Prefer the offline knowledge pack (`npm run knowledge -- lookup`) and Warframe Wiki. Do not live-browse for item/mechanic facts the pack can answer.

## Builds

1. Compare from local pack first (catalog/wiki + cached Overframe builds with mods/arcanes).
2. If local Overframe builds exist (`LOCAL_BUILDS_AVAILABLE`) — use them; do not search online unless the Operator asks.
3. If missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`):
   - **Online opted in** — crawl Overframe / YouTube / Wiki immediately. Never ask yes/no.
     - Web UI: Online search toggle ON → same as webchat `search_community_builds`.
     - Hermes Desktop: Operator said “search online” / “crawl community”, or Agent Reach is being used for that ask.
   - **Online not opted in** — stay local + agent-calculated; tell them to enable Online search (web) or say “search online” (Hermes).
4. Never invent fake video URLs. Cite only real tool results.
5. Full public pages (Hermes stand-in for webchat `fetch_web_page`): `curl -s "https://r.jina.ai/URL"` or Agent Reach. Prefer official patch text via `npm run patches -- detail`.

## Live data

Worldstate, market, and patches stay on their live CLIs/tools (`npm run wf`, `npm run market`, `npm run patches` / `patches -- detail`).
