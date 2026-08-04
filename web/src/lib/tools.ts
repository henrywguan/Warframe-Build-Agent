import type OpenAI from "openai";
import {
  compareLoadoutToTopBuilds,
  formatLoadoutCompare,
} from "@/lib/loadout-compare";
import { lookupLocalKnowledge } from "@/lib/local-knowledge";
import { searchCommunityBuildsOnline, searchWebOnline } from "@/lib/online-community-search";
import { LOCAL_KNOWLEDGE_TOOL_DESCRIPTION } from "@/lib/source-policy";
import { runOfflineDps } from "@/lib/offline-dps";
import {
  liveAlerts,
  liveCycles,
  liveFissures,
  liveInvasions,
  liveMarketDailyChanges,
  liveMarketPrice,
  livePatchNotesDailyChanges,
  livePatchNotesLatest,
  liveSortie,
  liveWorldstateSummary,
} from "@/lib/warframe-live";

const SEARCH_WEB_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_web",
    description:
      "General public web search (DuckDuckGo + Warframe Wiki) to back up AI answers with live sources. Use when facts may be patch-sensitive, time-sensitive, or missing from local tools. Available when the WebUI AI toggle is on. Cite only returned URLs.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g. 'Steel Path Excalibur survivability 2026')",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

const SEARCH_COMMUNITY_BUILDS_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_community_builds",
    description:
      "Live crawl of community build sources when Online search is enabled: Overframe.gg top builds (mods when available), DuckDuckGo web results, YouTube links, and Warframe Wiki opensearch. Call after lookup_local_knowledge when local Overframe builds are missing or the player wants wider community comparison. Requires Online search toggle (or chat yes).",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Item or build topic (e.g. Coda Hema, Revenant Prime steel path)",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

export const chatTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_worldstate_summary",
      description:
        "Get a live Warframe worldstate summary (sortie, fissure counts, cycles, invasions).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_fissures",
      description: "Get live Void Fissures. Optionally filter to Steel Path and/or relic tier.",
      parameters: {
        type: "object",
        properties: {
          steelPathOnly: {
            type: "boolean",
            description: "If true, only Steel Path fissures",
          },
          tier: {
            type: "string",
            description: "Relic tier such as Lith, Meso, Neo, Axi, Requiem, Omnia",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cycles",
      description: "Get open-world cycle timers (Cetus, Vallis, Cambion, Earth, Zariman, Duviri).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sortie",
      description: "Get today's Sortie boss, faction, missions, and modifiers.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_invasions",
      description: "Get active invasions and their rewards.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_alerts",
      description: "Get active alerts and rewards.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_market_price",
      description:
        "Get live Warframe.market v2 top-order price summary for an item slug (e.g. mirage_prime_set).",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Item slug from warframe.market URLs",
          },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_market_daily_changes",
      description:
        "Read day-over-day Warframe.market price changes from the daily 4pm Pacific scrape snapshot.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patch_notes_latest",
      description: "Get the latest official Warframe updates/hotfixes from warframe.com.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max entries to return (default 8)",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patch_notes_daily_changes",
      description:
        "Read newly listed updates/hotfixes from the daily 4pm Pacific patch-notes snapshot job (day-over-day hub diff).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_local_knowledge",
      description: LOCAL_KNOWLEDGE_TOOL_DESCRIPTION,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Item or topic to look up (e.g. 'Coda Hema', 'Revenant Prime', 'Serration')",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_loadout_to_overframe",
      description:
        "Compare a parsed player loadout (item name + mods + arcanes) against the top 3 local Overframe/import builds for that item. Use after reading a screenshot or when the player pastes their mods.",
      parameters: {
        type: "object",
        properties: {
          itemName: {
            type: "string",
            description: "Warframe or weapon name (e.g. Coda Hema, Revenant Prime)",
          },
          mods: {
            type: "array",
            items: { type: "string" },
            description: "Mod names visible on the loadout",
          },
          arcanes: {
            type: "array",
            items: { type: "string" },
            description: "Arcane names visible on the loadout",
          },
        },
        required: ["itemName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimate_modded_dps",
      description:
        "Offline arsenal-style modded DPS calculator using the local catalog + curated mod multipliers. Use for weapon damage/DPS questions and A vs B compares without live search. Presets: rifle-viral-heat, rifle-corrosive-heat, rifle-raw-crit, pistol-viral-heat, shotgun-viral-heat, typical.",
      parameters: {
        type: "object",
        properties: {
          weapon: {
            type: "string",
            description: "Weapon name for a single estimate (optional if weaponB set for compare)",
          },
          weaponB: {
            type: "string",
            description: "Second weapon name for an A vs B compare",
          },
          mods: {
            type: "array",
            items: { type: "string" },
            description: "Explicit max-rank mod names to apply to both weapons",
          },
          preset: {
            type: "string",
            description: "Curated mod preset id",
          },
          viralAmp: {
            type: "number",
            description: "Optional viral amp multiplier",
          },
        },
        additionalProperties: false,
      },
    },
  },
];

/** Base tools, plus AI web search and/or community crawl based on UI toggles. */
export function getChatTools(options?: {
  onlineSearch?: boolean;
  aiChat?: boolean;
}): OpenAI.Chat.ChatCompletionTool[] {
  const tools = [...chatTools];
  if (options?.aiChat) tools.push(SEARCH_WEB_TOOL);
  if (options?.onlineSearch) tools.push(SEARCH_COMMUNITY_BUILDS_TOOL);
  return tools;
}

type ToolArgs = Record<string, unknown>;

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function runChatTool(
  name: string,
  rawArgs: string,
  options?: { onlineSearch?: boolean; aiChat?: boolean },
): Promise<string> {
  let args: ToolArgs = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as ToolArgs) : {};
  } catch {
    return `Could not parse tool arguments: ${rawArgs}`;
  }

  try {
    switch (name) {
      case "get_worldstate_summary":
        return await liveWorldstateSummary();
      case "get_fissures":
        return await liveFissures({
          steelPathOnly: asBoolean(args.steelPathOnly),
          tier: asString(args.tier),
        });
      case "get_cycles":
        return await liveCycles();
      case "get_sortie":
        return await liveSortie();
      case "get_invasions":
        return await liveInvasions();
      case "get_alerts":
        return await liveAlerts();
      case "get_market_price": {
        const slug = asString(args.slug);
        if (!slug) return "Missing required slug.";
        return await liveMarketPrice(slug);
      }
      case "get_market_daily_changes":
        return await liveMarketDailyChanges();
      case "get_patch_notes_latest": {
        const limitRaw = args.limit;
        const limit =
          typeof limitRaw === "number" && Number.isFinite(limitRaw)
            ? Math.max(1, Math.min(25, Math.floor(limitRaw)))
            : 8;
        return await livePatchNotesLatest(limit);
      }
      case "get_patch_notes_daily_changes":
        return await livePatchNotesDailyChanges();
      case "lookup_local_knowledge": {
        const query = asString(args.query);
        if (!query) return "Missing required query.";
        return await lookupLocalKnowledge(query);
      }
      case "search_web": {
        if (!options?.aiChat) {
          return [
            "AI_CHAT_DISABLED: the AI toggle is off.",
            "Tell the player to turn on AI in the chat UI for smart replies with web search, or answer from local tools only.",
          ].join("\n");
        }
        const query = asString(args.query);
        if (!query) return "Missing required query.";
        return await searchWebOnline(query);
      }
      case "search_community_builds": {
        if (!options?.onlineSearch) {
          return [
            "ONLINE_SEARCH_DISABLED: the Online search toggle is off.",
            "Tell the player to turn on Online search in the chat UI (or reply yes), then call search_community_builds again.",
            "Do not invent Overframe/YouTube URLs.",
          ].join("\n");
        }
        const query = asString(args.query);
        if (!query) return "Missing required query.";
        return await searchCommunityBuildsOnline(query);
      }
      case "compare_loadout_to_overframe": {
        const itemName = asString(args.itemName);
        if (!itemName) return "Missing required itemName.";
        const mods = Array.isArray(args.mods)
          ? args.mods.map(String).filter(Boolean)
          : [];
        const arcanes = Array.isArray(args.arcanes)
          ? args.arcanes.map(String).filter(Boolean)
          : [];
        const result = await compareLoadoutToTopBuilds(
          { itemName, mods, arcanes },
          3,
        );
        return formatLoadoutCompare(result);
      }
      case "estimate_modded_dps": {
        const weapon = asString(args.weapon);
        const weaponB = asString(args.weaponB);
        const mods = Array.isArray(args.mods)
          ? args.mods.map(String).filter(Boolean)
          : undefined;
        const preset = asString(args.preset);
        const viralAmp =
          typeof args.viralAmp === "number" && Number.isFinite(args.viralAmp)
            ? args.viralAmp
            : undefined;
        if (!weapon && !weaponB) {
          return "Provide weapon (and optional weaponB for compare).";
        }
        return await runOfflineDps({
          weapon: weapon || weaponB || "",
          weaponB: weapon && weaponB ? weaponB : undefined,
          mods,
          preset,
          viralAmp,
        });
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Tool ${name} failed: ${message}`;
  }
}
