/**
 * Shared wording for web chat source selection.
 * Keep in sync with overlay `chat_prompt.py` and `docs/source-policy.md`.
 */
export const SOURCE_POLICY = `## Source policy
- **General / non-Warframe questions (AI chat on):** use \`search_web\` and \`fetch_web_page\`. Do not force Warframe framing or Warframe Wiki. Cite returned URLs only.
- **Warframe facts / digests / mechanics / arcanes:** use offline local knowledge via \`lookup_local_knowledge\` (WFCD catalog + Wiki digests + mechanics digests + Arcane Enhancement digests). Do not browse the live web for these when the pack can answer.
- **DPS / damage estimates:** use \`estimate_modded_dps\` (offline calculator). Do not invent modded DPS numbers.
- **Screenshot / pasted loadouts:** use \`compare_loadout_to_overframe\` against top local Overframe builds.
- **Live timers / prices / patches only:** use the matching live tools. Do not invent those values. For detailed patch text use \`get_patch_notes_detail\` or \`fetch_web_page\` on the official URL.
- **Warframe build-related requests** (mod setups, “best build”, Steel Path config, loadout advice, comparisons):
  1. Always call \`lookup_local_knowledge\` first and compare using **local pack** data (catalog/wiki + cached Overframe builds when present).
  2. If the tool reports \`LOCAL_BUILDS_AVAILABLE\`, use those local Overframe/import builds for the comparison. You may still refine with agent-calculated notes for the player's goal/budget.
  3. If the tool reports \`ONLINE_SEARCH_CONFIRMATION_REQUIRED\` / local Overframe builds are missing:
     - **Online search toggle ON:** call \`search_community_builds\` immediately. Never ask the player to type yes/no.
     - **Online search toggle OFF:** stay local + agent-calculated only. Tell them to turn on **Online search** in the chat UI if they want a live crawl. Never ask them to type **yes**.
  4. Never invent fake video/Overframe URLs. Cite only URLs returned by tools.
- When AI / Online search tools return link lists, call \`fetch_web_page\` (or rely on FULL_PAGE_EXCERPTS already attached) to read promising pages before answering.
- Do not call \`search_community_builds\` when Online search is off. General \`search_web\` (AI on) is separate from the Online search toggle.`;

export const LOCAL_KNOWLEDGE_TOOL_DESCRIPTION =
  "Recall offline Warframe facts from the local knowledge pack: WFCD catalog, Wiki digests, mechanics digests (damage/status/armor/factions), Arcane Enhancement digests, and cached Overframe builds. For build questions, call this first. When Overframe builds are missing it returns ONLINE_SEARCH_CONFIRMATION_REQUIRED — if Online search is on, call search_community_builds (do not ask yes/no); if off, stay local and mention the Online search toggle.";

export const ONLINE_SEARCH_CONFIRMATION_MARKER = "ONLINE_SEARCH_CONFIRMATION_REQUIRED";
export const LOCAL_BUILDS_AVAILABLE_MARKER = "LOCAL_BUILDS_AVAILABLE";

/** Marker text when local Overframe builds are missing (toggle controls online crawl). */
export function formatOnlineSearchConfirmation(itemNames: string[]): string {
  const items =
    itemNames.length === 0
      ? "this item"
      : itemNames.length === 1
        ? itemNames[0]!
        : itemNames.slice(0, 3).join(", ");
  return [
    `${ONLINE_SEARCH_CONFIRMATION_MARKER} for ${items}`,
    `Local pack has catalog/wiki facts for comparison, but no cached Overframe community builds for ${items}.`,
    "If **Online search** is on in the chat UI: call search_community_builds now (do not ask the player to type yes/no).",
    "If Online search is off: stay local + agent-calculated only, and tell the player to enable the Online search toggle for a live crawl.",
  ].join("\n");
}

export function looksLikeBuildRequest(text: string): boolean {
  return /\b(builds?|mod\s*setup|loadout|forma|steel\s*path(\s+(build|config|setup))?|best\s+(build|setup|mods?)|max(imum)?\s+damage(\s+build)?|compare\s+builds?|community\s+builds?|crawl\s+(the\s+)?web|search\s+online)\b/i.test(
    text,
  );
}

export function annotateToolResultForOnlineConsent(
  result: string,
  onlineSearchEnabled: boolean,
): string {
  if (
    !onlineSearchEnabled ||
    !result.includes(ONLINE_SEARCH_CONFIRMATION_MARKER)
  ) {
    return result;
  }
  return [
    result,
    "",
    "ONLINE_SEARCH_ALLOWED: Online search toggle is on.",
    "Call search_community_builds now for live Overframe + public web/YouTube/Wiki results (full-page excerpts may already be attached). Do NOT ask the player to type yes/no.",
  ].join("\n");
}
