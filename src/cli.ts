#!/usr/bin/env node
import { WarframeStatusClient, WarframeStatusError } from "./client.js";
import {
  formatAlerts,
  formatArchonHunt,
  formatCycles,
  formatEvents,
  formatFissures,
  formatInvasions,
  formatNightwave,
  formatSortie,
  formatSteelPath,
  formatSummary,
  formatVoidTrader,
} from "./format.js";
import { DEFAULT_LANGUAGE, DEFAULT_PLATFORM, type Platform } from "./types.js";

const COMMANDS = [
  "summary",
  "alerts",
  "fissures",
  "invasions",
  "sortie",
  "archon-hunt",
  "nightwave",
  "void-trader",
  "steel-path",
  "cycles",
  "events",
  "get",
  "help",
] as const;

type Command = (typeof COMMANDS)[number];

interface ParsedArgs {
  command: Command;
  platform: Platform;
  language: string;
  json: boolean;
  steelPathOnly: boolean;
  tier?: string;
  field?: string;
}

function printHelp(): void {
  console.log(`Warframe Status CLI (default platform: ${DEFAULT_PLATFORM} for PC + mobile / cross-play)

Usage:
  npm run wf -- <command> [options]

Commands:
  summary         Snapshot of sortie, hunt, fissures, cycles, Baro, etc.
  alerts          Active alerts
  fissures        Void fissures
  invasions       Active invasions
  sortie          Daily sortie
  archon-hunt     Weekly Archon Hunt
  nightwave       Nightwave challenges
  void-trader     Baro Ki'Teer
  steel-path      Steel Path honor reward
  cycles          Open-world cycles
  events          Active events
  get <field>     Raw worldstate child field (e.g. arbitration, news)

Options:
  --platform <pc|ps4|psn|xb1|swi|ns>   Default: pc
  --language <code>                    Default: en
  --steel-path                         Fissures: Steel Path only
  --tier <Lith|Meso|Neo|Axi|Requiem|Omnia>
  --json                               Print raw JSON
  --help                               Show help
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const rawCommand = args.shift() ?? "help";

  let command: Command;
  if (rawCommand === "--help" || rawCommand === "-h") {
    command = "help";
  } else if ((COMMANDS as readonly string[]).includes(rawCommand)) {
    command = rawCommand as Command;
  } else {
    throw new Error(`Unknown command "${rawCommand}". Run with --help.`);
  }

  const parsed: ParsedArgs = {
    command,
    platform: DEFAULT_PLATFORM,
    language: DEFAULT_LANGUAGE,
    json: false,
    steelPathOnly: false,
  };

  while (args.length) {
    const token = args.shift()!;
    switch (token) {
      case "--help":
      case "-h":
        parsed.command = "help";
        break;
      case "--json":
        parsed.json = true;
        break;
      case "--steel-path":
        parsed.steelPathOnly = true;
        break;
      case "--platform": {
        const value = args.shift();
        if (!value) throw new Error("--platform requires a value");
        parsed.platform = value as Platform;
        break;
      }
      case "--language": {
        const value = args.shift();
        if (!value) throw new Error("--language requires a value");
        parsed.language = value;
        break;
      }
      case "--tier": {
        const value = args.shift();
        if (!value) throw new Error("--tier requires a value");
        parsed.tier = value;
        break;
      }
      default:
        if (parsed.command === "get" && !parsed.field && !token.startsWith("-")) {
          parsed.field = token;
          break;
        }
        throw new Error(`Unknown option "${token}"`);
    }
  }

  return parsed;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.command === "help") {
    printHelp();
    return;
  }

  const client = new WarframeStatusClient({
    platform: parsed.platform,
    language: parsed.language,
  });

  const print = (value: unknown, text: string) => {
    if (parsed.json) {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(text);
    }
  };

  switch (parsed.command) {
    case "summary": {
      const data = await client.getSummary();
      print(data, formatSummary(data));
      break;
    }
    case "alerts": {
      const data = await client.getAlerts();
      print(data, formatAlerts(data));
      break;
    }
    case "fissures": {
      const data = await client.getFissures();
      print(
        data,
        formatFissures(data, {
          steelPathOnly: parsed.steelPathOnly,
          tier: parsed.tier,
        }),
      );
      break;
    }
    case "invasions": {
      const data = await client.getInvasions();
      print(data, formatInvasions(data));
      break;
    }
    case "sortie": {
      const data = await client.getSortie();
      print(data, formatSortie(data));
      break;
    }
    case "archon-hunt": {
      const data = await client.getArchonHunt();
      print(data, formatArchonHunt(data));
      break;
    }
    case "nightwave": {
      const data = await client.getNightwave();
      print(data, formatNightwave(data));
      break;
    }
    case "void-trader": {
      const data = await client.getVoidTrader();
      print(data, formatVoidTrader(data));
      break;
    }
    case "steel-path": {
      const data = await client.getSteelPath();
      print(data, formatSteelPath(data));
      break;
    }
    case "cycles": {
      const data = await client.getCycles();
      print(data, formatCycles(data));
      break;
    }
    case "events": {
      const data = await client.getEvents();
      print(data, formatEvents(data));
      break;
    }
    case "get": {
      if (!parsed.field) {
        throw new Error('Command "get" requires a field, e.g. npm run wf -- get arbitration');
      }
      const data = await client.getField(parsed.field);
      print(data, JSON.stringify(data, null, 2));
      break;
    }
    default:
      printHelp();
  }
}

main().catch((error: unknown) => {
  if (error instanceof WarframeStatusError) {
    console.error(`${error.message} [status=${error.status}]`);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
