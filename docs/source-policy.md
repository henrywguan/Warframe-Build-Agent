# Source policy (web chat + overlay + Hermes)

How the agent chooses evidence. **Warframe:** local knowledge pack first; Online search toggle for community-build crawls — never ask the player to type yes/no. **Web AI on:** general research via `search_web` / `fetch_web_page` for any topic (Hermes-aligned; not Warframe-only).

## Default — offline knowledge (not live web browsing)

For item stats, Warframe/weapon digests, **mechanics**, **arcanes**, DPS estimates, and other non-live facts:

1. Prefer the **local knowledge pack** (`lookup_local_knowledge` / `npm run knowledge -- lookup`) — catalog + Wiki digests + mechanics digests + Arcane digests under `data/knowledge/`.
2. Prefer **offline modded DPS** (`estimate_modded_dps` / `npm run knowledge -- dps|compare-dps`) over inventing numbers.
3. Prefer **loadout compare** (`compare_loadout_to_overframe` / `npm run knowledge -- compare-loadout`) for pasted/screenshot loadouts.
4. Do **not** browse the live web for these when the pack can answer.
5. Live tools stay reserved for worldstate, market, and patch hubs (plus `get_patch_notes_detail` / `fetch_web_page` for full official text).

## Build-related requests

When the player asks for a mod setup, “best build”, Steel Path config, loadout advice, or **build comparison**:

1. **Local first** — call/read the knowledge pack. Use catalog + wiki facts and any cached Overframe/import builds under `builds/by-item/` for the comparison.
2. **If local Overframe builds exist** (`LOCAL_BUILDS_AVAILABLE`) — compare from that local data. Optionally refine with agent-calculated notes for goal/budget. Do **not** search online unless the player asks to widen the comparison.
3. **If local Overframe builds are missing** (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`):
   - **Online search toggle ON** — call **`search_community_builds`** immediately (live Overframe.gg crawl + DuckDuckGo web/YouTube + Warframe Wiki + full-page excerpts). Never ask the player to type **yes**.
   - **Online search toggle OFF** — stay offline: local facts + agent-calculated only. Tell them to enable **Online search** in the chat UI if they want a live crawl. Never ask them to type **yes**.
4. Never invent fake video URLs. Cite only URLs returned by tools.
5. For specific public pages (wiki, guides, patch notes), call **`fetch_web_page`** (or use `FULL_PAGE_EXCERPTS` already attached to search results).

## Surfaces

| Surface | Facts | Builds |
| --- | --- | --- |
| **Web chat** | `lookup_local_knowledge`, mechanics/arcanes digests | **AI on:** Cursor-class general agent — any-topic `search_web` + `fetch_web_page` (no forced Warframe) + Warframe tools. **Online search on:** Warframe `search_community_builds` (+ full pages). AI off: offline chatbot |
| **Web DPS** | `estimate_modded_dps` | Offline calculator presets |
| **Web loadout** | `compare_loadout_to_overframe` / Attach OCR | Top-3 local Overframe diffs |
| **Overlay action cards** | Local-pack gate card | Agent-calculated cards + Online-search toggle tip |
| **Overlay chat → web API** (`CHAT_API_URL`) | Same tools/prompt as web chat | Same Online-search toggle gate |
| **Overlay chat → direct OpenAI** | No pack tools — say so | Do not claim online search without the toggle |
| **Hermes + local LLM** | Shell `npm run knowledge -- …` with `terminal.cwd` = repo | Same markers; **always online** — crawl when local builds are missing (no toggle; never ask yes/no). Web chat toggle does not apply. |

## Markers

| Marker | Meaning |
| --- | --- |
| `LOCAL_BUILDS_AVAILABLE` | Cached Overframe/import builds present — compare locally |
| `ONLINE_SEARCH_CONFIRMATION_REQUIRED` | No local community builds — Online search toggle gates live crawl (never ask yes/no in chat) |
| `ONLINE_COMMUNITY_SEARCH_RESULTS` | Live `search_community_builds` tool returned Overframe/web/YouTube/Wiki hits |
| `WEB_SEARCH_RESULTS` | Live `search_web` tool returned DuckDuckGo/Wiki hits (AI chat on) |
| `WEB_PAGE_CONTENT` / `FULL_PAGE_EXCERPTS` | Full-page fetch/parse of a public URL |

## Related

- Pack pull/query: [`docs/offline-knowledge.md`](offline-knowledge.md)
- Hermes + Qwen: [`docs/hermes-export.md`](hermes-export.md), [`hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md)
- Broader source list: [`docs/sources.md`](sources.md)
