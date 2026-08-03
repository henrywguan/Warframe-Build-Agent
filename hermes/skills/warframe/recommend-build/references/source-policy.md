# Source policy (Hermes)

**Local database first for build comparisons; ask before searching online.**

## Facts

Prefer the offline knowledge pack (`npm run knowledge -- lookup`) and Warframe Wiki. Do not live-browse for item/mechanic facts the pack can answer.

## Builds

1. Compare from local pack first (catalog/wiki + cached Overframe builds with mods/arcanes).
2. If local Overframe builds exist (`LOCAL_BUILDS_AVAILABLE`) — use them; do not search online unless the Operator asks.
3. If missing (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`) — ask:

   > Search online (Overframe, YouTube, and other public build sources) for community comparisons?  
   > Reply **yes** to allow online search, or **no** to stay local + agent-calculated only.

4. Only after explicit **yes** may Ordis use online Overframe / YouTube / public sources. Never invent fake video URLs.
5. If **no** — local facts + agent-calculated best build only.

## Live data

Worldstate, market, and patches stay on their live CLIs/tools (`npm run wf`, `npm run market`, `npm run patches`).
