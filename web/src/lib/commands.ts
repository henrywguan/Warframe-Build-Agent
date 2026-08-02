import { runChatTool } from "@/lib/tools";

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
    "Slash commands:",
    ...CHAT_COMMANDS.map((command) => `• ${command.usage} — ${command.description}`),
    "",
    "You can also ask in plain language, for example:",
    "• Budget Steel Path build for Coda Hema",
    "• Laetum vs Felarx for EDA",
    "• What’s up for Cetus night right now?",
    "",
    "Daily scrapes refresh around 4pm Pacific (market + patch notes).",
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

/** Run a slash command without the LLM when possible. */
export async function runSlashCommand(text: string): Promise<CommandResult> {
  const parsed = parseSlash(text);
  if (!parsed) return { handled: false };

  const { name, args } = parsed;

  if (name === "list" || name === "help" || name === "commands") {
    return { handled: true, content: formatCommandList(), toolsUsed: [] };
  }

  switch (name) {
    case "summary":
      return {
        handled: true,
        content: await runChatTool("get_worldstate_summary", "{}"),
        toolsUsed: ["get_worldstate_summary"],
      };
    case "fissures": {
      const steelPathOnly = args.some((arg) =>
        ["sp", "steel", "steelpath", "steel-path"].includes(arg.toLowerCase()),
      );
      const tier = args.find(
        (arg) =>
          !["sp", "steel", "steelpath", "steel-path"].includes(arg.toLowerCase()),
      );
      return {
        handled: true,
        content: await runChatTool(
          "get_fissures",
          JSON.stringify({ steelPathOnly, tier }),
        ),
        toolsUsed: ["get_fissures"],
      };
    }
    case "cycles":
      return {
        handled: true,
        content: await runChatTool("get_cycles", "{}"),
        toolsUsed: ["get_cycles"],
      };
    case "sortie":
      return {
        handled: true,
        content: await runChatTool("get_sortie", "{}"),
        toolsUsed: ["get_sortie"],
      };
    case "invasions":
      return {
        handled: true,
        content: await runChatTool("get_invasions", "{}"),
        toolsUsed: ["get_invasions"],
      };
    case "alerts":
      return {
        handled: true,
        content: await runChatTool("get_alerts", "{}"),
        toolsUsed: ["get_alerts"],
      };
    case "market": {
      const slug = args[0];
      if (!slug) {
        return {
          handled: true,
          content: "Usage: /market <slug>\nExample: /market mirage_prime_set",
          toolsUsed: [],
        };
      }
      return {
        handled: true,
        content: await runChatTool("get_market_price", JSON.stringify({ slug })),
        toolsUsed: ["get_market_price"],
      };
    }
    case "market-changes":
    case "market_changes":
      return {
        handled: true,
        content: await runChatTool("get_market_daily_changes", "{}"),
        toolsUsed: ["get_market_daily_changes"],
      };
    case "patches":
    case "hotfix":
    case "patch":
    case "patchnotes":
    case "patch-notes": {
      const limit = args[0] && Number.isFinite(Number(args[0])) ? Number(args[0]) : 8;
      return {
        handled: true,
        content: await runChatTool(
          "get_patch_notes_latest",
          JSON.stringify({ limit }),
        ),
        toolsUsed: ["get_patch_notes_latest"],
      };
    }
    case "patch-changes":
    case "patch_changes":
      return {
        handled: true,
        content: await runChatTool("get_patch_notes_daily_changes", "{}"),
        toolsUsed: ["get_patch_notes_daily_changes"],
      };
    default:
      return {
        handled: true,
        content: [
          `Unknown command: /${name}`,
          "",
          formatCommandList(),
        ].join("\n"),
        toolsUsed: [],
      };
  }
}
