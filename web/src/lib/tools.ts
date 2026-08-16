import type OpenAI from "openai";
import {
  compareLoadoutToTopBuilds,
  formatLoadoutCompare,
} from "@/lib/loadout-compare";
import { lookupLocalKnowledge } from "@/lib/local-knowledge";
import { searchCommunityBuildsOnline, searchWebOnline } from "@/lib/online-community-search";
import { fetchPublicPage, formatFetchedPage } from "@/lib/fetch-page";
import { LOCAL_KNOWLEDGE_TOOL_DESCRIPTION } from "@/lib/source-policy";
import { runOfflineDps } from "@/lib/offline-dps";
import {
  composeSavedBuildFromToolArgs,
  encodeSavedBuildToolResult,
} from "@/lib/save-build-compose";
import {
  packArcaneLookup,
  packBuildLookup,
  packFarmLookup,
  packPresetList,
} from "@/lib/pack-commands";
import {
  liveAlerts,
  liveArchonHunt,
  liveArbitration,
  liveBaro,
  liveConstruction,
  liveCycles,
  liveDailyDeals,
  liveEvents,
  liveFissures,
  liveInvasions,
  liveMarketDailyChanges,
  liveMarketPrice,
  liveMarketSlugSearch,
  liveNightwave,
  livePatchNotesDailyChanges,
  livePatchNotesDetail,
  livePatchNotesLatest,
  liveSortie,
  liveWorldstateSummary,
} from "@/lib/warframe-live";
import {
  formatEhpResult,
  formatFormaResult,
  runFarmVsBuySlash,
  runInventorySlash,
  runRelicSlash,
} from "@/lib/tier-calcs";

const SEARCH_WEB_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_web",
    description:
      "General public web search (DuckDuckGo; Warframe Wiki only when the query looks Warframe-related) with auto-fetched full-page excerpts from top hits. Does not force Warframe framing on general topics. Available in LLM mode. Cite only returned URLs. For a specific URL, call fetch_web_page.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g. 'Steel Path Excalibur survivability 2026' or 'strawberry smoothie recipes')",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

const FETCH_WEB_PAGE_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "fetch_web_page",
    description:
      "Fetch and parse a full public web page into readable text (wiki, patch notes, guides, recipes, Overframe, forums, etc.). Use after search_web / search_community_builds when you need the body of a specific URL, or whenever the player asks about content on a known page. Available in LLM mode or when Online search is on. Only http(s) public URLs.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full http(s) URL to fetch",
        },
        maxChars: {
          type: "number",
          description: "Optional body length cap (default 10000)",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
};

const SEARCH_COMMUNITY_BUILDS_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_community_builds",
    description:
      "Live crawl of community build sources when Online search is enabled: Overframe.gg top builds (mods when available), DuckDuckGo web results, YouTube links, Warframe Wiki, plus auto-fetched full-page excerpts. Call after lookup_local_knowledge when local Overframe builds are missing — do not ask the player to type yes/no (the Online search toggle is consent).",
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
      name: "get_baro",
      description: "Get Baro Ki'Teer (Void Trader) location, timer, and inventory when present.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nightwave",
      description: "Get Nightwave season/phase and active challenges.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_archon_hunt",
      description: "Get the weekly Archon Hunt boss, faction, and missions.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_events",
      description: "Get active worldstate events and timers.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_arbitration",
      description: "Get today's Arbitration mission node, type, faction, and timer.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_deals",
      description: "Get Darvo's daily deals (discounted items, stock, timers).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_construction",
      description: "Get Fomorian / Razorback invasion construction progress.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "estimate_ehp",
      description:
        "Estimate Warframe effective HP from health, shields, armor, optional DR, overguard, and Adaptation stacks (offline heuristic).",
      parameters: {
        type: "object",
        properties: {
          health: { type: "number", description: "Base health" },
          shields: { type: "number", description: "Shield capacity" },
          armor: { type: "number", description: "Armor rating" },
          dr: { type: "number", description: "Fractional damage reduction (e.g. 0.75)" },
          overguard: { type: "number", description: "Overguard pool" },
          adaptation: {
            type: "number",
            description: "Adaptation stacks (0–10)",
          },
        },
        required: ["health", "shields", "armor"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_forma",
      description:
        "Heuristic Forma count from mod capacity needed vs current capacity and matching polarities.",
      parameters: {
        type: "object",
        properties: {
          needed: { type: "number", description: "Total mod capacity needed" },
          current: { type: "number", description: "Current capacity (default 60)" },
          matching: {
            type: "number",
            description: "Count of polarity-matched mod slots",
          },
        },
        required: ["needed"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_relic",
      description:
        "Void Relic refinement odds table, radshare tips, and optional pack lookup for a part/relic name.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Relic or part name (optional)",
          },
          refinement: {
            type: "string",
            description: "intact | exceptional | flawless | radiant",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "parse_inventory",
      description:
        "Parse a pasted owned-gear list into coarse frames/weapons/mods buckets (session-only heuristic).",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Comma or newline separated inventory list",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "farm_vs_buy",
      description:
        "Offline farm route from wiki digest plus market price check tips for farm-vs-buy decisions.",
      parameters: {
        type: "object",
        properties: {
          item: { type: "string", description: "Item or part name" },
        },
        required: ["item"],
        additionalProperties: false,
      },
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
      name: "search_market_slug",
      description:
        "Fuzzy-search Warframe.market item names to resolve the correct market slug before pricing.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Item display name or partial slug (e.g. Mirage Prime set)",
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
      name: "lookup_local_builds",
      description:
        "List top local Overframe/import builds for an item from the offline pack (no LLM).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Item name (e.g. Coda Hema)" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_farm_route",
      description:
        "Extract acquisition/farming notes for an item from the local wiki digest.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Item name to farm" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_arcanes",
      description:
        "Look up Arcane Enhancement digests from the local pack by name or slot (primary/warframe/…).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Arcane name or slot (e.g. Primary Merciless, primary)",
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
      name: "list_dps_presets",
      description: "List curated offline DPS mod presets and their asOf date.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
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
      description:
        "List recent official Warframe updates/hotfixes from the warframe.com hub (titles + links only — not full patch text). Use get_patch_notes_detail for a synopsis of a specific version.",
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
      name: "get_patch_notes_detail",
      description:
        "Fetch and parse the full official Warframe patch-notes page text for a version (e.g. 43.0.8), slug (43-0-8), official URL, or latest/newest. Required for detailed synopsis / what changed questions. Never invent hotfix contents — only summarize this tool's returned text.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'Version (43.0.8), slug (43-0-8), official warframe.com patch URL, or "latest"',
          },
          maxChars: {
            type: "number",
            description: "Optional body length cap (default 12000)",
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
      name: "save_build",
      description:
        "Save a player loadout into the desktop Saved Builds (Arsenal) pane. Auto-classifies a single itemName via the local catalog into Warframe / Primary / Secondary / Melee, or companion name hints. Prefer explicit warframe/primary/secondary/melee/companion fields when the Operator lists a full arsenal. Use when they ask to save/add/store a build (text or after reading a screenshot).",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Card title (e.g. SP Soma)",
          },
          folder: {
            type: "string",
            description: "Optional folder name in the Arsenal pane",
          },
          itemName: {
            type: "string",
            description:
              "Single gear piece to auto-categorize (Warframe or weapon). Use with mods/arcanes when only one item is provided.",
          },
          mods: {
            type: "array",
            items: { type: "string" },
            description: "Mods for itemName (auto-classified slot)",
          },
          arcanes: {
            type: "array",
            items: { type: "string" },
            description: "Arcanes for itemName",
          },
          warframe: { type: "string" },
          primary: { type: "string" },
          secondary: { type: "string" },
          melee: { type: "string" },
          companion: { type: "string" },
          warframeMods: { type: "array", items: { type: "string" } },
          primaryMods: { type: "array", items: { type: "string" } },
          secondaryMods: { type: "array", items: { type: "string" } },
          meleeMods: { type: "array", items: { type: "string" } },
          companionMods: { type: "array", items: { type: "string" } },
          warframeArcanes: { type: "array", items: { type: "string" } },
          primaryArcanes: { type: "array", items: { type: "string" } },
          secondaryArcanes: { type: "array", items: { type: "string" } },
          meleeArcanes: { type: "array", items: { type: "string" } },
          companionArcanes: { type: "array", items: { type: "string" } },
          crystals: {
            type: "array",
            items: { type: "string" },
            description:
              "Archon crystals, e.g. \"Crimson Primary Damage\", \"Amber Casting Speed\"",
          },
          notes: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimate_modded_dps",
      description:
        "Offline arsenal-style modded DPS calculator using the local catalog + curated mod multipliers (DB asOf 2026-08-03). Prefers Galvanized Steel Path shells over Serration/Split Chamber. Presets: rifle-viral-heat, rifle-viral-electric, rifle-corrosive-heat, rifle-raw-crit, rifle-budget, pistol-viral-heat, shotgun-viral-heat, typical. Mention Primary Debilitate/Merciless as separate arcane recommendations.",
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

/** Base tools, plus LLM web search and/or community crawl based on UI toggles. */
export function getChatTools(options?: {
  onlineSearch?: boolean;
  /** LLM mode (Warframe advisor or general agent) — enables search_web + fetch_web_page. */
  llmMode?: boolean;
}): OpenAI.Chat.ChatCompletionTool[] {
  const tools = [...chatTools];
  if (options?.llmMode) tools.push(SEARCH_WEB_TOOL);
  if (options?.onlineSearch) tools.push(SEARCH_COMMUNITY_BUILDS_TOOL);
  if (options?.llmMode || options?.onlineSearch) tools.push(FETCH_WEB_PAGE_TOOL);
  return tools;
}

type ToolArgs = Record<string, unknown>;

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Clamp optional tool maxChars args (body length caps). */
function clampMaxChars(value: unknown): number | undefined {
  const n = asFiniteNumber(value);
  if (n == null) return undefined;
  return Math.max(500, Math.min(50_000, Math.floor(n)));
}

async function withRequiredQuery(
  args: ToolArgs,
  run: (query: string) => Promise<string>,
): Promise<string> {
  const query = asString(args.query);
  if (!query) return "Missing required query.";
  return run(query);
}

export async function runChatTool(
  name: string,
  rawArgs: string,
  options?: {
    onlineSearch?: boolean;
    llmMode?: boolean;
  },
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
      case "get_baro":
        return await liveBaro();
      case "get_nightwave":
        return await liveNightwave();
      case "get_archon_hunt":
        return await liveArchonHunt();
      case "get_events":
        return await liveEvents();
      case "get_arbitration":
        return await liveArbitration();
      case "get_daily_deals":
        return await liveDailyDeals();
      case "get_construction":
        return await liveConstruction();
      case "estimate_ehp": {
        const health = asFiniteNumber(args.health);
        const shields = asFiniteNumber(args.shields);
        const armor = asFiniteNumber(args.armor);
        if (health == null || shields == null || armor == null) {
          return "Missing required health, shields, and armor numbers.";
        }
        return formatEhpResult({
          health,
          shields,
          armor,
          damageReduction: asFiniteNumber(args.dr),
          overguard: asFiniteNumber(args.overguard),
          adaptationStacks: asFiniteNumber(args.adaptation),
        });
      }
      case "plan_forma": {
        const needed = asFiniteNumber(args.needed);
        if (needed == null) {
          return "Missing required needed (capacity) number.";
        }
        return formatFormaResult({
          capacityNeeded: needed,
          currentCapacity: asFiniteNumber(args.current),
          matchingPolarities: asFiniteNumber(args.matching),
        });
      }
      case "lookup_relic": {
        const query = asString(args.query) ?? "";
        const refinement = asString(args.refinement);
        return await runRelicSlash(query, refinement ? ["--refinement", refinement] : []);
      }
      case "parse_inventory": {
        const text = asString(args.text);
        if (!text) return "Missing required text.";
        return runInventorySlash(text);
      }
      case "farm_vs_buy": {
        const item = asString(args.item);
        if (!item) return "Missing required item.";
        return await runFarmVsBuySlash(item);
      }
      case "get_market_price": {
        const slug = asString(args.slug);
        if (!slug) return "Missing required slug.";
        return await liveMarketPrice(slug);
      }
      case "search_market_slug":
        return await withRequiredQuery(args, liveMarketSlugSearch);
      case "lookup_local_builds":
        return await withRequiredQuery(args, packBuildLookup);
      case "lookup_farm_route":
        return await withRequiredQuery(args, packFarmLookup);
      case "lookup_arcanes":
        return await withRequiredQuery(args, packArcaneLookup);
      case "list_dps_presets":
        return await packPresetList();
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
      case "get_patch_notes_detail": {
        const query = asString(args.query) || "latest";
        return await livePatchNotesDetail(query, clampMaxChars(args.maxChars));
      }
      case "get_patch_notes_daily_changes":
        return await livePatchNotesDailyChanges();
      case "lookup_local_knowledge": {
        const query = asString(args.query);
        if (!query) return "Missing required query.";
        return await lookupLocalKnowledge(query);
      }
      case "search_web": {
        if (!options?.llmMode) {
          return [
            "LLM_MODE_DISABLED: no LLM is configured for this session.",
            "Tell the player to configure LLM / Ollama for smart replies with web search, or answer from local tools only.",
          ].join("\n");
        }
        const query = asString(args.query);
        if (!query) return "Missing required query.";
        return await searchWebOnline(query);
      }
      case "fetch_web_page": {
        if (!options?.llmMode && !options?.onlineSearch) {
          return [
            "FETCH_PAGE_DISABLED: configure LLM / Ollama and/or turn on Online search in the chat UI to fetch full pages.",
            "Answer from local tools only until then.",
          ].join("\n");
        }
        const url = asString(args.url);
        if (!url) return "Missing required url.";
        try {
          const page = await fetchPublicPage(url, {
            maxChars: clampMaxChars(args.maxChars),
          });
          return formatFetchedPage(page);
        } catch (error) {
          return error instanceof Error
            ? `Could not fetch page: ${error.message}`
            : `Could not fetch page: ${String(error)}`;
        }
      }
      case "search_community_builds": {
        if (!options?.onlineSearch) {
          return [
            "ONLINE_SEARCH_DISABLED: the Online search toggle is off.",
            "Tell the player to turn on Online search in the chat UI, then call search_community_builds again.",
            "Do not ask them to type yes/no. Do not invent Overframe/YouTube URLs.",
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
      case "save_build": {
        const strList = (...keys: string[]): string[] | undefined => {
          for (const key of keys) {
            const value = args[key];
            if (Array.isArray(value)) {
              return value.map(String).filter(Boolean);
            }
          }
          return undefined;
        };
        const build = await composeSavedBuildFromToolArgs({
          name: asString(args.name),
          folder: asString(args.folder),
          itemName: asString(args.itemName),
          mods: strList("mods"),
          arcanes: strList("arcanes"),
          warframe: asString(args.warframe),
          primary: asString(args.primary),
          secondary: asString(args.secondary),
          melee: asString(args.melee),
          companion: asString(args.companion),
          warframeMods: strList("warframeMods"),
          primaryMods: strList("primaryMods"),
          secondaryMods: strList("secondaryMods"),
          meleeMods: strList("meleeMods"),
          companionMods: strList("companionMods"),
          warframeArcanes: strList("warframeArcanes"),
          primaryArcanes: strList("primaryArcanes"),
          secondaryArcanes: strList("secondaryArcanes"),
          meleeArcanes: strList("meleeArcanes"),
          companionArcanes: strList("companionArcanes"),
          crystals: strList("crystals"),
          notes: asString(args.notes),
        });
        const hasGear =
          build.warframe.name ||
          build.primary.name ||
          build.secondary.name ||
          build.melee.name ||
          build.companion.name;
        if (!hasGear) {
          return "save_build needs at least itemName or warframe/primary/secondary/melee/companion.";
        }
        return encodeSavedBuildToolResult(build, asString(args.folder));
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
