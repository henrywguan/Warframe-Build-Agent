# Source policy (web chat + overlay + Hermes)

How the agent chooses evidence. **Local knowledge pack first; ask before searching online for builds.**

## Default — offline knowledge (not live web browsing)

For item stats, Warframe/weapon digests, **mechanics**, **arcanes**, DPS estimates, and other non-live facts:

1. Prefer the **local knowledge pack** (`lookup_local_knowledge` / `npm run knowledge -- lookup`) — catalog + Wiki digests + mechanics digests + Arcane digests under `data/knowledge/`.
2. Prefer **offline modded DPS** (`estimate_modded_dps` / `npm run knowledge -- dps|compare-dps`) over inventing numbers.
3. Prefer **loadout compare** (`compare_loadout_to_overframe` / `npm run knowledge -- compare-loadout`) for pasted/screenshot loadouts.
4. Do **not** browse the live web for these when the pack can answer.
5. Live tools stay reserved for worldstate, market, and patch hubs.

## Build-related requests

When the player asks for a mod setup, “best build”, Steel Path config, loadout advice, or **build comparison**:

1. **Local first** — call/read the knowledge pack. Use catalog + wiki facts and any cached Overframe/import builds under `builds/by-item/` for the comparison.
2. **If local Overframe builds exist** (`LOCAL_BUILDS_AVAILABLE`) — compare from that local data. Optionally refine with agent-calculated notes for goal/budget. Do **not** search online unless the player asks to widen the comparison.
3. **If local Overframe builds are missing** (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`) — **stop and ask for confirmation** before any online search, **unless** the WebUI **Online search** toggle is on (standing consent):

   > Search online (Overframe, YouTube, and other public build sources) for community comparisons?  
   > Reply **yes** to allow online search, or **no** to stay local + agent-calculated only.

4. **Only after explicit yes**, clear chat consent, **or the Online search toggle** may the agent call **`search_community_builds`** (live Overframe.gg crawl + DuckDuckGo web/YouTube + Warframe Wiki) and reason from those tool results. Never invent fake video URLs.
5. **If the player says no** (and the toggle is off) — stay offline: local facts + agent-calculated best build only.

When the toggle is on, the chat API registers `search_community_builds` and the model is instructed to use it after local lookup. Overframe may still be Cloudflare-blocked on some networks; DuckDuckGo/Wiki results still return when possible.

## Surfaces

| Surface | Facts | Builds |
| --- | --- | --- |
| **Web chat** | `lookup_local_knowledge`, mechanics/arcanes digests | **AI on:** LLM + `search_web`. **Online search on:** `search_community_builds`. AI off: offline chatbot |
| **Web DPS** | `estimate_modded_dps` | Offline calculator presets |
| **Web loadout** | `compare_loadout_to_overframe` / Attach OCR | Top-3 local Overframe diffs |
| **Overlay action cards** | Local-pack gate card | Agent-calculated cards + confirmation card |
| **Overlay chat → web API** (`CHAT_API_URL`) | Same tools/prompt as web chat | Same confirmation flow (+ loadout context) |
| **Overlay chat → direct OpenAI** | No pack tools — say so | Still ask before claiming an online search |
| **Hermes + local LLM** | Shell `npm run knowledge -- …` with `terminal.cwd` = repo | Same markers / consent rules |

## Markers

| Marker | Meaning |
| --- | --- |
| `LOCAL_BUILDS_AVAILABLE` | Cached Overframe/import builds present — compare locally |
| `ONLINE_SEARCH_CONFIRMATION_REQUIRED` | No local community builds — ask yes/no before online search |
| `ONLINE_COMMUNITY_SEARCH_RESULTS` | Live `search_community_builds` tool returned Overframe/web/YouTube/Wiki hits |
| `WEB_SEARCH_RESULTS` | Live `search_web` tool returned DuckDuckGo/Wiki hits (AI chat on) |

## Related

- Pack pull/query: [`docs/offline-knowledge.md`](offline-knowledge.md)
- Hermes + Qwen: [`docs/hermes-export.md`](hermes-export.md), [`hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md)
- Broader source list: [`docs/sources.md`](sources.md)
