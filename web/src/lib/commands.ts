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
import {
  relicPositionalArgs,
  runEhpSlash,
  runExplainStub,
  runFormaSlash,
  runInventorySlash,
  runOptimizeStub,
  runRelicSlash,
  runFarmVsBuySlash,
} from "@/lib/tier-calcs";

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
    name: "model",
    usage: "/model",
    description: "Show the LLM model id for this chat session",
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
    description: "Latest official updates/hotfixes (hub titles/links)",
    kind: "tool",
  },
  {
    name: "hotfix",
    usage: "/hotfix",
    description: "Alias for /patches",
    kind: "tool",
  },
  {
    name: "patch",
    usage: "/patch [version|url|latest]",
    description: "Full official patch-note text / synopsis source",
    kind: "tool",
  },
  {
    name: "patch-changes",
    usage: "/patch-changes",
    description: "Daily 4pm Pacific newly listed patch notes",
    kind: "tool",
  },
  {
    name: "arbitration",
    usage: "/arbitration",
    description: "Live Arbitration mission + timer",
    kind: "tool",
  },
  {
    name: "darvo",
    usage: "/darvo",
    description: "Darvo daily deals",
    kind: "tool",
  },
  {
    name: "daily-deals",
    usage: "/daily-deals",
    description: "Alias for /darvo",
    kind: "tool",
  },
  {
    name: "construction",
    usage: "/construction",
    description: "Fomorian / Razorback construction progress",
    kind: "tool",
  },
  {
    name: "relic",
    usage: "/relic <query>",
    description: "Void Relic refinement odds + radshare tips",
    kind: "tool",
  },
  {
    name: "explain",
    usage: "/explain <topic>",
    description: "Mechanics explain stub → /knowledge",
    kind: "meta",
  },
  {
    name: "optimize",
    usage: "/optimize <mode>",
    description: "Mission loadout tips stub (archon|sp|netracell|da|eidolon|pt|arb|circuit)",
    kind: "meta",
  },
  {
    name: "ehp",
    usage: "/ehp --health N --shields N --armor N …",
    description: "Effective HP estimate (offline)",
    kind: "tool",
  },
  {
    name: "forma",
    usage: "/forma --needed N [--current 60]",
    description: "Forma count heuristic (offline)",
    kind: "tool",
  },
  {
    name: "inventory",
    usage: "/inventory <pasted list>",
    description: "Parse owned gear list (heuristic)",
    kind: "tool",
  },
  {
    name: "farm-vs-buy",
    usage: "/farm-vs-buy <item>",
    description: "Farm route + market price tips",
    kind: "tool",
  },
  {
    name: "buyvsfarm",
    usage: "/buyvsfarm <item>",
    description: "Alias for /farm-vs-buy",
    kind: "tool",
  },
  {
    name: "profile",
    usage: "/profile",
    description: "Player profile stub (CLI / localStorage later)",
    kind: "meta",
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
    "• npm run wf -- summary | fissures --steel-path | cycles | baro | nightwave | archon | arbitration | darvo | construction",
    "• npm run market -- price <slug> | slug-search \"…\" | changes",
    "• npm run patches -- latest | changes",
    "• npm run knowledge -- status | lookup \"…\" | farm|builds \"…\" | ehp|forma|relic|profile|farm-vs-buy",
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
  if (name === "model" || name === "llm") {
    return meta(
      [
        "Ask in plain language: “What model LLM is this agent running?”",
        "The chat API answers with the resolved model id for this session (from LLM / Ollama settings or server OPENAI_MODEL).",
        "Tip: check the footer when AI is on — it shows the active model name.",
      ].join("\n"),
    );
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
    case "patchnotes":
    case "patch-notes": {
      const limit = args[0] && Number.isFinite(Number(args[0])) ? Number(args[0]) : 8;
      return fromTool("get_patch_notes_latest", { limit });
    }
    case "patch":
    case "patch-detail":
    case "patchdetail": {
      const query = args[0]?.trim() || "latest";
      return fromTool("get_patch_notes_detail", { query });
    }
    case "patch-changes":
    case "patch_changes":
      return fromTool("get_patch_notes_daily_changes");
    case "arbitration":
    case "arb":
      return fromTool("get_arbitration");
    case "darvo":
    case "daily-deals":
    case "dailydeals":
      return fromTool("get_daily_deals");
    case "construction":
      return fromTool("get_construction");
    case "relic": {
      const query = relicPositionalArgs(args);
      if (!query && !args.some((a) => /^--refinement$/i.test(a))) {
        return meta(
          [
            "Usage: /relic <query> [--refinement intact|exceptional|flawless|radiant]",
            "Example: /relic Mirage Prime Neuroptics --refinement radiant",
            "Tip: odds table only — omit query for refinement table.",
          ].join("\n"),
        );
      }
      return {
        handled: true,
        content: await runRelicSlash(query, args),
        toolsUsed: ["lookup_relic"],
      };
    }
    case "explain":
      return meta(runExplainStub(args.join(" ").trim() || undefined));
    case "optimize":
    case "loadout":
      return meta(runOptimizeStub(args[0]));
    case "ehp":
      return {
        handled: true,
        content: runEhpSlash(args),
        toolsUsed: ["estimate_ehp"],
      };
    case "forma":
      return {
        handled: true,
        content: runFormaSlash(args),
        toolsUsed: ["plan_forma"],
      };
    case "inventory":
    case "owned": {
      const text = args.join(" ").trim();
      return {
        handled: true,
        content: runInventorySlash(text),
        toolsUsed: ["parse_inventory"],
      };
    }
    case "farm-vs-buy":
    case "buyvsfarm":
    case "farmvsbuy": {
      const item = args.join(" ").trim();
      if (!item) {
        return meta(
          "Usage: /farm-vs-buy <item>\nExample: /farm-vs-buy Mirage Prime Neuroptics",
        );
      }
      return {
        handled: true,
        content: await runFarmVsBuySlash(item),
        toolsUsed: ["farm_vs_buy"],
      };
    }
    case "profile":
      return meta(
        [
          "Player profile — stub",
          "",
          "Persistent profiles are not stored in the web UI yet.",
          "From repo root:",
          "• npm run knowledge -- profile",
          "• npm run knowledge -- profile-set --mr N [--steel-path] [--budget low|mid|high]",
          "",
          "Future: localStorage profile in web chat.",
        ].join("\n"),
      );
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
