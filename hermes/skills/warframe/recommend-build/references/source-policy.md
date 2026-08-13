# Source policy (Hermes)

**Local pack first for speed; Hermes is always online for live crawls — never ask the Operator to type yes/no.**

Web chat still uses an **Online search** toggle. Hermes Desktop does **not** — treat Online as always on here.

## Facts

Prefer the offline knowledge pack (`npm run knowledge -- lookup`) and Warframe Wiki. If the pack cannot answer, fetch the public page (Jina / Agent Reach) rather than inventing.

## Builds

1. Compare from local pack first (catalog/wiki + cached Overframe builds with mods/arcanes).
2. If local Overframe builds exist (`LOCAL_BUILDS_AVAILABLE`) — use them; widen online when the Operator asks or the cache looks stale/thin.
3. If missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`): **crawl Overframe / YouTube / Wiki / web immediately** (see `community-search` skill). Never invent video URLs.
4. If a crawl fails (Cloudflare, empty), say so and fall back to agent-calculated + pack facts.
5. Full public pages (Hermes stand-in for webchat `fetch_web_page`): `curl -s "https://r.jina.ai/URL"` or Agent Reach. Prefer official patch text via `npm run patches -- detail`.

## Live data

Worldstate, market, and patches stay on their live CLIs/tools (`npm run wf`, `npm run market`, `npm run patches` / `patches -- detail`).
