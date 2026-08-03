/**
 * Shared wording for web chat source selection.
 * Keep in sync with overlay `chat_prompt.py` and `docs/source-policy.md`.
 */
export const SOURCE_POLICY = `## Source policy
- **Default (facts / digests / mechanics context):** use offline local knowledge via \`lookup_local_knowledge\` (WFCD catalog + Warframe Wiki digests). Do not browse the live web for these when the pack can answer.
- **Live timers / prices / patches only:** use the matching live tools. Do not invent those values.
- **Build-related requests** (mod setups, “best build”, Steel Path config, loadout advice):
  1. Prefer **Overframe** community top builds when the local pack returns them.
  2. Prefer **YouTube** creator builds when the player cites a creator/video, or when naming a concrete public approach — never invent fake video URLs or claim you watched a video you did not.
  3. Otherwise give an **agent-calculated** best build for the stated goal (core mods, flex slots, budget substitutions), grounded in offline item facts from the pack.
- A wiki/catalog digest alone is not a full build. If Overframe cache builds are missing, say so briefly and use YouTube (if cited) or agent-calculated advice.`;

export const LOCAL_KNOWLEDGE_TOOL_DESCRIPTION =
  "Recall offline Warframe facts from the local knowledge pack (WFCD catalog + Warframe Wiki digests). Prefer for item/mechanic facts without live web browsing. May also return cached Overframe top builds — treat those as Overframe build evidence for build questions; do not invent builds from wiki text alone.";
