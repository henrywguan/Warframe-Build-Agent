# Source policy (web chat + overlay)

How the agent chooses evidence. **Local database first for build comparisons; ask before searching online.**

## Default — offline knowledge (not live web browsing)

For item stats, Warframe/weapon digests, mechanics context, and other non-live facts:

1. Prefer the **local knowledge pack** (`lookup_local_knowledge` / `npm run knowledge -- lookup`) — WFCD catalog + Warframe Wiki digests under `data/knowledge/`.
2. Do **not** browse the live web for these when the pack can answer.
3. Live tools stay reserved for worldstate, market, and patch hubs.

## Build-related requests

When the player asks for a mod setup, “best build”, Steel Path config, loadout advice, or **build comparison**:

1. **Local first** — call/read the knowledge pack. Use catalog + wiki facts and any cached Overframe/import builds under `builds/by-item/` for the comparison.
2. **If local Overframe builds exist** (`LOCAL_BUILDS_AVAILABLE`) — compare from that local data. Optionally refine with agent-calculated notes for goal/budget. Do **not** search online unless the player asks to widen the comparison.
3. **If local Overframe builds are missing** (`ONLINE_SEARCH_CONFIRMATION_REQUIRED`) — **stop and ask for confirmation** before any online search:

   > Search online (Overframe, YouTube, and other public build sources) for community comparisons?  
   > Reply **yes** to allow online search, or **no** to stay local + agent-calculated only.

4. **Only after explicit yes** may the agent search or reason from online Overframe, YouTube, or other public build sources. Never invent fake video URLs.
5. **If the player says no** — stay offline: local facts + agent-calculated best build only.

## Surfaces

| Surface | Facts | Builds |
| --- | --- | --- |
| **Web chat** | `lookup_local_knowledge` | Local pack first → ask yes/no before online Overframe/YouTube/public search |
| **Overlay action cards** | Local-pack gate card | Agent-calculated cards + local/online confirmation card |
| **Overlay chat → web API** | Same tools/prompt as web chat | Same confirmation flow (+ loadout context) |
| **Overlay chat → direct OpenAI** | No tool access; say so if pack would help | Still ask before claiming an online search |

## Markers

| Marker | Meaning |
| --- | --- |
| `LOCAL_BUILDS_AVAILABLE` | Cached Overframe/import builds present — compare locally |
| `ONLINE_SEARCH_CONFIRMATION_REQUIRED` | No local community builds — ask yes/no before online search |

## Related

- Pack pull/query: [`docs/offline-knowledge.md`](offline-knowledge.md)
- Broader source list: [`docs/sources.md`](sources.md)
