import type OpenAI from "openai";
import {
  compareLoadoutToTopBuilds,
  formatLoadoutCompare,
} from "@/lib/loadout-compare";
import { lookupLocalKnowledge } from "@/lib/local-knowledge";
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
        "Read the latest saved day-over-day Warframe.market watchlist changes from the daily 4pm Pacific snapshot job.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patch_notes_latest",
      description:
        "Get the latest official Warframe PC updates/hotfixes from warframe.com/en/patch-notes (live hub scrape).",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "How many recent entries to return (default 8)",
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
            description: "Mod preset id (default typical / rifle-viral-heat by class)",
          },
          viralAmp: {
            type: "number",
            description: "Optional Viral health amp multiplier override (default ~2.5 when viral mods present)",
          },
        },
        additionalProperties: false,
      },
    },
  },
];

type ToolArgs = Record<string, unknown>;

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function runChatTool(name: string, rawArgs: string): Promise<string> {
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
