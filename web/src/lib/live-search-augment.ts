import { ONLINE_SEARCH_CONFIRMATION_MARKER } from "@/lib/source-policy";
import {
  searchCommunityBuildsOnline,
  searchWebOnline,
} from "@/lib/online-community-search";

function parseToolQuery(rawArgs: string): string | undefined {
  try {
    const parsed = JSON.parse(rawArgs || "{}") as { query?: unknown };
    return typeof parsed.query === "string" && parsed.query.trim()
      ? parsed.query.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

function itemNamesFromConfirmation(text: string): string[] {
  const match = text.match(
    new RegExp(`${ONLINE_SEARCH_CONFIRMATION_MARKER}\\s+for\\s+(.+)`, "i"),
  );
  if (!match?.[1]) return [];
  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * When consent/toggles allow it, auto-fetch live community/web results after a
 * local lookup that still needs online builds — local models often never call
 * the follow-up tool themselves.
 */
export async function maybeAugmentLookupWithLiveSearch(options: {
  toolName: string;
  rawArgs: string;
  result: string;
  onlineSearch: boolean;
  aiChat: boolean;
}): Promise<{ result: string; extraTools: string[] }> {
  if (options.toolName !== "lookup_local_knowledge") {
    return { result: options.result, extraTools: [] };
  }
  if (!options.result.includes(ONLINE_SEARCH_CONFIRMATION_MARKER)) {
    return { result: options.result, extraTools: [] };
  }

  const query =
    parseToolQuery(options.rawArgs) ||
    itemNamesFromConfirmation(options.result)[0];
  if (!query) return { result: options.result, extraTools: [] };

  const extraTools: string[] = [];
  const sections: string[] = [options.result];

  if (options.onlineSearch) {
    const community = await searchCommunityBuildsOnline(query);
    sections.push("", community);
    extraTools.push("search_community_builds");
  } else if (options.aiChat) {
    // Build auto-augment stays Warframe-scoped even though general search_web is unbiased.
    const web = await searchWebOnline(`${query} warframe steel path build`, {
      forceWarframe: true,
    });
    sections.push("", web);
    extraTools.push("search_web");
  }

  if (!extraTools.length) return { result: options.result, extraTools: [] };

  sections.push(
    "",
    "AUTO_LIVE_SEARCH: live results were already fetched above because Online search and/or AI is enabled.",
    "Answer the player's build/loadout question using the item facts + these live hits.",
    "Do not digress into unrelated mechanics (Blast/Railjack/etc.) unless they asked.",
    "If Overframe is blocked, prefer DuckDuckGo/YouTube/Wiki URLs and an agent-calculated plan from the local wiki/catalog facts.",
  );

  return { result: sections.join("\n"), extraTools };
}

/** Prefer tool text over a blank model completion. */
export function fallbackFromToolResults(
  toolPayloads: string[],
  toolsUsed: string[],
): string {
  const joined = toolPayloads.filter(Boolean).join("\n\n").trim();
  if (!joined) {
    return "I could not finish that answer. Try again, enable Online search for Warframe community builds, or rephrase the question.";
  }
  const itemMatch = joined.match(/^##\s+([^\n(]+)\s*\(/m);
  const item = itemMatch?.[1]?.trim();
  const headline = item
    ? `Here is what I found for **${item}** (local pack${toolsUsed.includes("search_community_builds") || toolsUsed.includes("search_web") ? " + live search" : ""}). Local Overframe builds may still be missing — use links below and wiki characteristics rather than inventing mods.`
    : "Here is what the tools returned. Local Overframe builds may still be missing — use the sources below rather than inventing mods.";
  const clipped = joined.length > 4500 ? `${joined.slice(0, 4500)}…` : joined;
  return `${headline}\n\n${clipped}`;
}
