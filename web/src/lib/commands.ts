import {
  compareLoadoutToTopBuilds,
  formatLoadoutCompare,
} from "@/lib/loadout-compare";
import { parseLoadoutFromOcrText } from "@/lib/loadout-parse";
import { lookupLocalKnowledge } from "@/lib/local-knowledge";
import { runOfflineDps } from "@/lib/offline-dps";
import {
  packPresetDps,
  packPresetList,
  stubDuviriCircuit,
  stubFocusShards,
  stubVendor,
} from "@/lib/pack-commands";
import { runChatTool } from "./tools";

export interface ChatCommand {
  name: string;
  usage: string;
  description: string;
  /** If set, this command can run without the LLM. */
  kind: "meta" | "tool";
}

export const CHAT_COMMANDS: ChatCommand[] = [
  {
    name: "list",
    usage: "/list",
    description: "Show available chat commands",
    kind: "meta",
  },
  {
    name: "help",
    usage: "/help",
    description: "Alias for /list",
    kind: "meta",
  },
  {
    name: "knowledge",
    usage: "/knowledge <query>",
    description: "Offline knowledge pack lookup (no LLM)",
    kind: "tool",
  },
  {
    name: "compare",
    usage: "/compare <item> | mods…",
    description: "Compare a pasted loadout to top 3 local Overframe builds",
    kind: "tool",
  },
  {
    name: "dps",
    usage: "/dps <weapon> [vs <weaponB>] [--preset name]",
    description: "Offline modded DPS estimate / A vs B compare",
    kind: "tool",
  },
  {
    name: "summary",
    usage: "/summary",
    description: "Live worldstate summary",
    kind: "tool",
  },
  {
    name: "fissures",
    usage: "/fissures [sp|steel] [tier]",
    description: "Live Void Fissures (optional Steel Path / tier)",
    kind: "tool",
  },
  {
    name: "cycles",
    usage: "/cycles",
    description: "Open-world cycle timers",
    kind: "tool",
  },
  {
    name: "sortie",
    usage: "/sortie",
    description: "Today's Sortie",
    kind: "tool",
  },
  {
    name: "invasions",
    usage: "/invasions",
    description: "Active invasions + rewards",
    kind: "tool",
  },
  {
    name: "alerts",
    usage: "/alerts",
    description: "Active alerts + rewards",
    kind: "tool",
  },
  {
    name: "baro",
    usage: "/baro",
    description: "Baro Ki'Teer location / inventory",
    kind: "tool",
  },
  {
    name: "nightwave",
    usage: "/nightwave",
    description: "Nightwave challenges",
    kind: "tool",
  },
  {
    name: "archon",
    usage: "/archon",
    description: "Weekly Archon Hunt",
    kind: "tool",
  },
  {
    name: "weekly",
    usage: "/weekly",
    description: "Alias for /archon",
    kind: "tool",
  },
  {
    name: "event",
    usage: "/event",
    description: "Active worldstate events",
    kind: "tool",
  },
  {
    name: "duviri",
    usage: "/duviri",
    description: "Duviri / Circuit guidance stub (+ /cycles tip)",
    kind: "meta",
  },
  {
    name: "circuit",
    usage: "/circuit",
    description: "Alias for /duviri",
    kind: "meta",
  },
  {
    name: "build",
    usage: "/build <item>",
    description: "Top local Overframe/import builds for an item",
    kind: "tool",
  },
  {
    name: "farm",
    usage: "/farm <item>",
    description: "Acquisition / farming notes from wiki digest",
    kind: "tool",
  },
  {
    name: "arcanes",
    usage: "/arcanes <name|slot>",
    description: "Local Arcane Enhancement digests",
    kind: "tool",
  },
  {
    name: "preset",
    usage: "/preset list | /preset <name> <weapon>",
    description: "List DPS presets or run one on a weapon",
    kind: "tool",
  },
  {
    name: "focus",
    usage: "/focus [frame]",
    description: "Archon shard / focus guidance stub",
    kind: "meta",
  },
  {
    name: "shards",
    usage: "/shards [frame]",
    description: "Alias for /focus",
    kind: "meta",
  },
  {
    name: "vendor",
    usage: "/vendor <syndicate>",
    description: "Standing gift priorities stub",
    kind: "meta",
  },
  {
    name: "slug",
    usage: "/slug <item name>",
    description: "Resolve Warframe.market slug",
    kind: "tool",
  },
  {
    name: "market",
    usage: "/market <slug>",
    description: "Live Warframe.market price (e.g. mirage_prime_set)",
    kind: "tool",
  },
  {
    name: "market-changes",
    usage: "/market-changes",
    description: "Daily 4pm Pacific market scrape changes",
    kind: "tool",
  },
  {
    name: "patches",
    usage: "/patches [n]",
    description: "Latest official updates/hotfixes (live hub)",
    kind: "tool",
  },
  {
    name: "hotfix",
    usage: "/hotfix",
    description: "Alias for /patches",
    kind: "tool",
  },
  {
    name: "patch-changes",
    usage: "/patch-changes",
    description: "Daily 4pm Pacific newly listed patch notes",
    kind: "tool",
  },
];

export function formatCommandList(): string {
  const lines = [
    "Warframe Build Agent — commands",
    "",
    "Web slash commands:",
    ...CHAT_COMMANDS.map((command) => `• ${command.usage} — ${command.description}`),
    "",
    "Cursor / agent commands (in Cursor chat):",
    "• /cleanup-simplify — tidy recent diff + fast verify",
    "• /cleanup-simplify -all — tidy + full overlay/web integrity suite",
    "• /knowledge — pull or query offline knowledge pack (WFCD/Wiki/Overframe)",
    "",
    "Useful CLI:",
    "• npm run wf -- summary | fissures --steel-path | cycles | baro | nightwave | archon",
    "• npm run market -- price <slug> | slug-search \"…\" | changes",
    "• npm run patches -- latest | changes",
    "• npm run knowledge -- status | lookup \"…\" | farm|builds \"…\" | preset-list",
    "• npm run knowledge -- dps|compare-dps|compare-loadout … | import-builds | crawl-overframe",
    "• npm run cleanup:verify | cleanup:verify:all",
    "",
    "You can also ask in plain language, for example:",
    "• Budget Steel Path build for Coda Hema",
    "• Torid vs Ignis Wraith damage?",
    "• What’s up for Cetus night right now?",
    "",
    "Daily scrapes refresh around 4pm Pacific (market + patch notes).",
    "Full catalog: docs/commands.md · cleanup docs: docs/cleanup-agent.md",
  ];
  return lines.join("\n");
}

export function isSlashCommand(text: string): boolean {
  return text.trim().startsWith("/");
}

interface ParsedSlash {
  name: string;
  args: string[];
}

function parseSlash(text: string): ParsedSlash | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const withoutSlash = trimmed.slice(1).trim();
  if (!withoutSlash) return null;
  const [name, ...args] = withoutSlash.split(/\s+/);
  if (!name) return null;
  return { name: name.toLowerCase(), args };
}

export type CommandResult =
  | { handled: true; content: string; toolsUsed: string[] }
  | { handled: false };

function meta(content: string): CommandResult {
  return { handled: true, content, toolsUsed: [] };
}

async function fromTool(
  tool: string,
  args: Record<string, unknown> = {},
): Promise<CommandResult> {
  return {
    handled: true,
    content: await runChatTool(tool, JSON.stringify(args)),
    toolsUsed: [tool],
  };
}

/** Run a slash command without the LLM when possible. */
export async function runSlashCommand(text: string): Promise<CommandResult> {
  const parsed = parseSlash(text);
  if (!parsed) return { handled: false };

  const { name, args } = parsed;

  if (name === "list" || name === "help" || name === "commands") {
    return meta(formatCommandList());
  }

  switch (name) {
    case "summary":
      return fromTool("get_worldstate_summary");
    case "fissures": {
      const steelFlags = ["sp", "steel", "steelpath", "steel-path"];
      const steelPathOnly = args.some((arg) =>
        steelFlags.includes(arg.toLowerCase()),
      );
      const tier = args.find(
        (arg) => !steelFlags.includes(arg.toLowerCase()),
      );
      return fromTool("get_fissures", { steelPathOnly, tier });
    }
    case "cycles":
      return fromTool("get_cycles");
    case "sortie":
      return fromTool("get_sortie");
    case "invasions":
      return fromTool("get_invasions");
    case "alerts":
      return fromTool("get_alerts");
    case "baro":
    case "void-trader":
    case "voidtrader":
      return fromTool("get_baro");
    case "nightwave":
    case "nw":
      return fromTool("get_nightwave");
    case "archon":
    case "archon-hunt":
    case "weekly":
      return fromTool("get_archon_hunt");
    case "event":
    case "events":
      return fromTool("get_events");
    case "duviri":
    case "circuit":
      return meta(stubDuviriCircuit());
    case "build":
    case "builds": {
      const query = args.join(" ").trim();
      if (!query) {
        return meta("Usage: /build <item>\nExample: /build Coda Hema");
      }
      return fromTool("lookup_local_builds", { query });
    }
    case "farm": {
      const query = args.join(" ").trim();
      if (!query) {
        return meta("Usage: /farm <item>\nExample: /farm Enkaus");
      }
      return fromTool("lookup_farm_route", { query });
    }
    case "arcanes":
    case "arcane":
      return fromTool("lookup_arcanes", {
        query: args.join(" ").trim() || "arcanes",
      });
    case "preset":
    case "presets": {
      const raw = args.join(" ").trim();
      if (!raw || /^list$/i.test(raw)) {
        return {
          handled: true,
          content: await packPresetList(),
          toolsUsed: ["list_dps_presets"],
        };
      }
      const parts = raw.split(/\s+/);
      const presetName = parts[0]!;
      const weapon = parts.slice(1).join(" ").trim();
      if (!weapon) {
        return meta(
          [
            "Usage: /preset list",
            "       /preset <name> <weapon>",
            "Example: /preset rifle-viral-heat Coda Hema",
          ].join("\n"),
        );
      }
      return {
        handled: true,
        content: await packPresetDps(presetName, weapon),
        toolsUsed: ["estimate_modded_dps"],
      };
    }
    case "focus":
    case "shards":
    case "shard":
      return meta(stubFocusShards(args.join(" ").trim() || undefined));
    case "vendor":
      return meta(stubVendor(args.join(" ").trim() || undefined));
    case "slug": {
      const query = args.join(" ").trim();
      if (!query) {
        return meta("Usage: /slug <item name>\nExample: /slug Mirage Prime set");
      }
      return fromTool("search_market_slug", { query });
    }
    case "market": {
      const slug = args[0];
      if (!slug) {
        return meta(
          "Usage: /market <slug>\nExample: /market mirage_prime_set\nTip: /slug <item name> to resolve a slug",
        );
      }
      return fromTool("get_market_price", { slug });
    }
    case "market-changes":
    case "market_changes":
      return fromTool("get_market_daily_changes");
    case "patches":
    case "hotfix":
    case "patch":
    case "patchnotes":
    case "patch-notes": {
      const limit = args[0] && Number.isFinite(Number(args[0])) ? Number(args[0]) : 8;
      return fromTool("get_patch_notes_latest", { limit });
    }
    case "patch-changes":
    case "patch_changes":
      return fromTool("get_patch_notes_daily_changes");
    case "knowledge":
    case "lookup": {
      const query = args.join(" ").trim();
      if (!query) {
        return meta("Usage: /knowledge <query>\nExample: /knowledge Coda Hema");
      }
      return {
        handled: true,
        content: await lookupLocalKnowledge(query),
        toolsUsed: ["lookup_local_knowledge"],
      };
    }
    case "dps":
    case "compare-dps": {
      const raw = args.join(" ").trim();
      if (!raw) {
        return meta(
          [
            "Usage: /dps <weapon> [vs <weaponB>] [--preset rifle-viral-heat|typical]",
            "Examples:",
            "• /dps Coda Hema --preset rifle-viral-heat",
            "• /dps Torid vs Ignis Wraith --preset typical",
          ].join("\n"),
        );
      }
      const presetMatch = raw.match(/--preset\s+(\S+)/i);
      const preset = presetMatch?.[1];
      const withoutPreset = raw.replace(/--preset\s+\S+/i, "").trim();
      const parts = withoutPreset.split(/\s+vs\s+/i);
      const weapon = parts[0]?.trim() || "";
      const weaponB = parts[1]?.trim();
      if (!weapon) {
        return meta("Missing weapon name.");
      }
      return {
        handled: true,
        content: await runOfflineDps({
          weapon,
          weaponB: weaponB || undefined,
          preset: preset || "typical",
        }),
        toolsUsed: ["estimate_modded_dps"],
      };
    }
    case "compare": {
      const raw = args.join(" ").trim();
      if (!raw) {
        return meta(
          [
            "Usage: /compare <item name> | <mod1, mod2, …>",
            "Example: /compare Coda Hema | Serration, Vital Sense, Point Strike, Primary Merciless",
            "Or attach a loadout screenshot in the composer.",
          ].join("\n"),
        );
      }
      const [itemPart, modsPart] = raw.split("|").map((part) => part.trim());
      let loadout = await parseLoadoutFromOcrText(
        modsPart ? `${itemPart}\n${modsPart.replace(/,/g, "\n")}` : raw,
        itemPart || undefined,
      );
      if (itemPart) loadout = { ...loadout, itemName: itemPart };
      if (modsPart) {
        const names = modsPart
          .split(/[,;\n]/)
          .map((n) => n.trim())
          .filter(Boolean);
        const arcanes = names.filter((n) =>
          /arcane|merciless|deadhead|acceleration|blessing|moeaze/i.test(n),
        );
        const mods = names.filter((n) => !arcanes.includes(n));
        loadout = {
          ...loadout,
          mods: mods.length ? mods : loadout.mods,
          arcanes: arcanes.length ? arcanes : loadout.arcanes,
        };
      }
      const result = await compareLoadoutToTopBuilds(loadout, 3);
      return {
        handled: true,
        content: formatLoadoutCompare(result),
        toolsUsed: ["compare_loadout_to_overframe"],
      };
    }
    default:
      return meta([`Unknown command: /${name}`, "", formatCommandList()].join("\n"));
  }
}
