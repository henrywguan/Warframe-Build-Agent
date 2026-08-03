/**
 * Shared wording for web chat source selection.
 * Keep in sync with overlay `chat_prompt.py` and `docs/source-policy.md`.
 */
export const SOURCE_POLICY = `## Source policy
- **Default (facts / digests / mechanics context):** use offline local knowledge via \`lookup_local_knowledge\` (WFCD catalog + Warframe Wiki digests). Do not browse the live web for these when the pack can answer.
- **Live timers / prices / patches only:** use the matching live tools. Do not invent those values.
- **Build-related requests** (mod setups, “best build”, Steel Path config, loadout advice, comparisons):
  1. Always call \`lookup_local_knowledge\` first and compare using **local pack** data (catalog/wiki + cached Overframe builds when present).
  2. If the tool reports \`LOCAL_BUILDS_AVAILABLE\`, use those local Overframe/import builds for the comparison. You may still refine with agent-calculated notes for the player's goal/budget.
  3. If the tool reports \`ONLINE_SEARCH_CONFIRMATION_REQUIRED\` / local Overframe builds are missing: **stop and ask the player for confirmation** before any Overframe / YouTube / other online build search. Use the confirmation prompt from the tool (yes = allow online search; no = stay local + agent-calculated only).
  4. Only after an explicit **yes** (or clear consent) in this conversation may you search or reason from online Overframe, YouTube, or other public build sources. Never invent fake video URLs.
  5. If the player says **no**, stay offline: local facts + agent-calculated best build only.
- Do not browse online for builds proactively. A wiki/catalog digest alone is not a full community build comparison.`;

export const LOCAL_KNOWLEDGE_TOOL_DESCRIPTION =
  "Recall offline Warframe facts from the local knowledge pack (WFCD catalog + Warframe Wiki digests) and any cached Overframe builds. For build questions, call this first. When Overframe builds are missing it returns ONLINE_SEARCH_CONFIRMATION_REQUIRED — ask the player before any online Overframe/YouTube/public search.";

export const ONLINE_SEARCH_CONFIRMATION_MARKER = "ONLINE_SEARCH_CONFIRMATION_REQUIRED";
export const LOCAL_BUILDS_AVAILABLE_MARKER = "LOCAL_BUILDS_AVAILABLE";

/** Standard yes/no prompt when local Overframe builds are missing. */
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
    "Search online (Overframe, YouTube, and other public build sources) for community comparisons?",
    "Reply **yes** to allow online search, or **no** to stay local + agent-calculated only.",
  ].join("\n");
}

export function looksLikeBuildRequest(text: string): boolean {
  return /\b(builds?|mod\s*setup|loadout|forma|steel\s*path\s*(build|config|setup)|best\s+(build|setup|mods?)|compare\s+builds?|community\s+builds?)\b/i.test(
    text,
  );
}

/** Parse a short yes/no reply about online build search consent. */
export function parseOnlineSearchConsent(text: string): "yes" | "no" | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (
    /^(yes|y|yeah|yep|sure|ok|okay|please|go ahead|search|search online|do it)\b/.test(t) ||
    /\b(yes[,.]?\s+search|search online|go ahead|allow online)\b/.test(t)
  ) {
    return "yes";
  }
  if (
    /^(no|n|nope|nah|don't|dont|do not)\b/.test(t) ||
    /\b(stay local|offline only|no online|don't search|do not search)\b/.test(t)
  ) {
    return "no";
  }
  return null;
}

export function conversationAllowsOnlineBuildSearch(
  messages: Array<{ role: string; content: string }>,
): boolean {
  // Most recent explicit consent wins.
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]!;
    if (msg.role !== "user") continue;
    const consent = parseOnlineSearchConsent(msg.content);
    if (consent === "yes") return true;
    if (consent === "no") return false;
  }
  return false;
}
