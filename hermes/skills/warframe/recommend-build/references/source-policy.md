# Source policy (Hermes)

**Local database first for build comparisons; Online search toggle for live crawls — never ask the Operator to type yes/no.**

## Facts

Prefer the offline knowledge pack (`npm run knowledge -- lookup`) and Warframe Wiki. Do not live-browse for item/mechanic facts the pack can answer.

## Builds

1. Compare from local pack first (catalog/wiki + cached Overframe builds with mods/arcanes).
2. If local Overframe builds exist (`LOCAL_BUILDS_AVAILABLE`) — use them; do not search online unless the Operator asks.
3. If missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`):
   - **Online search on** — crawl Overframe / YouTube / Wiki immediately. Never ask yes/no.
   - **Online search off** — stay local + agent-calculated; tell the Operator to enable Online search if they want a live crawl.
4. Never invent fake video URLs. Cite only real tool results.
5. Use `fetch_web_page` / full-page excerpts when answering from a specific public URL.

## Live data

Worldstate, market, and patches stay on their live CLIs/tools (`npm run wf`, `npm run market`, `npm run patches` / `patches detail`).
