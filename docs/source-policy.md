# Source policy (web chat + overlay)

How the agent chooses evidence. **Offline first for facts; builds from Overframe, YouTube, or agent calculation.**

## Default — offline knowledge (not live web browsing)

For item stats, Warframe/weapon digests, mechanics context, and other non-live facts:

1. Prefer the **local knowledge pack** (`lookup_local_knowledge` / `npm run knowledge -- lookup`) — WFCD catalog + Warframe Wiki digests under `data/knowledge/`.
2. Do **not** browse the live web for these when the pack can answer.
3. Live tools stay reserved for worldstate, market, and patch hubs.

## Build-related requests

When the player asks for a mod setup, “best build”, Steel Path config, loadout advice, or similar:

| Priority | Source | Notes |
| --- | --- | --- |
| 1 | **Overframe** | Use top community builds from the local pack when present (`builds/by-item/`), or guidance grounded in Overframe when the player can open it. Popularity ≠ always optimal; check patch age. |
| 2 | **YouTube builds** | Use when the player cites a creator/video, or when recommending a concrete public creator approach. Never invent fake video URLs or claim you watched a video you did not. |
| 3 | **Agent-calculated** | Synthesize a best-effort build for the stated goal (core mods, flex, budget subs), grounded in offline item facts. |

If Overframe cache entries are missing (`overframeStatus: blocked` / no build file), say so briefly and fall through to YouTube (if cited) or agent-calculated advice — do not pretend the offline wiki digest alone is a full build guide.

## Surfaces

| Surface | Facts | Builds |
| --- | --- | --- |
| **Web chat** | `lookup_local_knowledge` | Overframe rows from pack → YouTube (cited) → agent-calculated |
| **Overlay action cards** | N/A (rule cards) | **Agent-calculated** from loadout fields (`recommend_actions`) |
| **Overlay chat → web API** | Same tools/prompt as web chat | Same as web chat (+ loadout context when sent) |
| **Overlay chat → direct OpenAI** | No tool access; say so if pack/live data would help | Agent-calculated (+ Overframe/YouTube reasoning without fake links) |

## Related

- Pack pull/query: [`docs/offline-knowledge.md`](offline-knowledge.md)
- Broader source list: [`docs/sources.md`](sources.md)
