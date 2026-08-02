import type OpenAI from "openai";
import {
  liveAlerts,
  liveCycles,
  liveFissures,
  liveInvasions,
  liveMarketDailyChanges,
  liveMarketPrice,
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
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Tool ${name} failed: ${message}`;
  }
}
