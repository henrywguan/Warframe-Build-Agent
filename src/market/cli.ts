#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WarframeMarketClient, WarframeMarketError } from "./client.js";
import { formatItemPrice, formatPriceChanges, formatSnapshot } from "./format.js";
import {
  buildDailySnapshot,
  computePriceChanges,
  findPreviousSnapshot,
  isDailyPullWindow,
  loadWatchlist,
  pacificDateString,
  pacificHour,
  readSnapshot,
  runDailyPricePull,
  summarizeTopOrders,
} from "./snapshot.js";
import type { DailyPriceChanges } from "./types.js";
import {
  MARKET_DAILY_PULL_HOUR,
  MARKET_DAILY_PULL_TIMEZONE,
  type MarketPlatform,
} from "./types.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_WATCHLIST = path.join(ROOT, "config/market-watchlist.json");
const DEFAULT_DATA_DIR = path.join(ROOT, "data/market");

const COMMANDS = [
  "price",
  "snapshot",
  "changes",
  "pull",
  "status",
  "help",
] as const;
type Command = (typeof COMMANDS)[number];

interface ParsedArgs {
  command: Command;
  slug?: string;
  json: boolean;
  force: boolean;
  watchlist: string;
  dataDir: string;
  platform?: MarketPlatform;
}

function printHelp(): void {
  console.log(`Warframe.market CLI (API: https://api.warframe.market/v2/)

Usage:
  npm run market -- <command> [args] [options]

Commands:
  price <slug>     Live top-order summary for one item
  snapshot         Pull watchlist snapshot now (no timezone gate)
  changes          Show latest saved day-over-day changes
  pull             Daily job: snapshot at 4pm Pacific, write changes
  status           Show Pacific time / pull-window status
  help             Show help

Options:
  --watchlist <path>   Default: config/market-watchlist.json
  --data-dir <path>    Default: data/market
  --platform <pc|ps4|xbox|switch>
  --force              For pull: ignore 4pm Pacific window check
  --json               Print raw JSON
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const raw = args.shift() ?? "help";
  const command =
    raw === "--help" || raw === "-h"
      ? "help"
      : ((COMMANDS as readonly string[]).includes(raw) ? (raw as Command) : null);

  if (!command) {
    throw new Error(`Unknown command "${raw}". Run with --help.`);
  }

  const parsed: ParsedArgs = {
    command,
    json: false,
    force: false,
    watchlist: DEFAULT_WATCHLIST,
    dataDir: DEFAULT_DATA_DIR,
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
      case "--force":
        parsed.force = true;
        break;
      case "--watchlist": {
        const value = args.shift();
        if (!value) throw new Error("--watchlist requires a path");
        parsed.watchlist = path.resolve(value);
        break;
      }
      case "--data-dir": {
        const value = args.shift();
        if (!value) throw new Error("--data-dir requires a path");
        parsed.dataDir = path.resolve(value);
        break;
      }
      case "--platform": {
        const value = args.shift();
        if (!value) throw new Error("--platform requires a value");
        parsed.platform = value as MarketPlatform;
        break;
      }
      default:
        if (parsed.command === "price" && !parsed.slug && !token.startsWith("-")) {
          parsed.slug = token;
          break;
        }
        throw new Error(`Unknown option or argument "${token}"`);
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

  const print = (value: unknown, text: string) => {
    if (parsed.json) console.log(JSON.stringify(value, null, 2));
    else console.log(text);
  };

  switch (parsed.command) {
    case "status": {
      const now = new Date();
      const payload = {
        timezone: MARKET_DAILY_PULL_TIMEZONE,
        pacificDate: pacificDateString(now),
        pacificHour: pacificHour(now),
        dailyPullHour: MARKET_DAILY_PULL_HOUR,
        inPullWindow: isDailyPullWindow(now),
      };
      print(
        payload,
        [
          `Timezone: ${payload.timezone}`,
          `Pacific date: ${payload.pacificDate}`,
          `Pacific hour: ${payload.pacificHour}`,
          `Daily pull hour: ${payload.dailyPullHour}:00`,
          `In pull window: ${payload.inPullWindow ? "yes" : "no"}`,
        ].join("\n"),
      );
      break;
    }
    case "price": {
      if (!parsed.slug) {
        throw new Error('Command "price" requires a slug, e.g. npm run market -- price mirage_prime_set');
      }
      const client = new WarframeMarketClient({ platform: parsed.platform });
      const [item, orders] = await Promise.all([
        client.getItem(parsed.slug).catch(() => null),
        client.getTopOrders(parsed.slug),
      ]);
      const summary = summarizeTopOrders(parsed.slug, orders, {
        name: item?.i18n?.en?.name ?? parsed.slug,
      });
      print(summary, formatItemPrice(summary));
      break;
    }
    case "snapshot": {
      const watchlist = await loadWatchlist(parsed.watchlist);
      const client = new WarframeMarketClient({
        platform: parsed.platform ?? watchlist.platform,
      });
      const snapshot = await buildDailySnapshot({
        client,
        slugs: watchlist.items,
        platform: parsed.platform ?? watchlist.platform,
      });
      print(snapshot, formatSnapshot(snapshot));
      break;
    }
    case "changes": {
      const latestPath = path.join(parsed.dataDir, "latest-changes.json");
      try {
        const { readFile } = await import("node:fs/promises");
        const raw = await readFile(latestPath, "utf8");
        const changes = JSON.parse(raw) as DailyPriceChanges;
        print(changes, formatPriceChanges(changes));
      } catch {
        const today = pacificDateString();
        const current = await readSnapshot(parsed.dataDir, today);
        const previous = current
          ? await findPreviousSnapshot(parsed.dataDir, current.date)
          : await findPreviousSnapshot(parsed.dataDir, today);
        if (!current || !previous) {
          throw new Error(
            "No saved daily changes yet. Run: npm run market -- pull --force",
          );
        }
        const changes = computePriceChanges(previous, current);
        print(changes, formatPriceChanges(changes));
      }
      break;
    }
    case "pull": {
      const result = await runDailyPricePull({
        watchlistPath: parsed.watchlist,
        dataDir: parsed.dataDir,
        client: new WarframeMarketClient({ platform: parsed.platform }),
        requirePullWindow: !parsed.force,
      });

      if (result.skipped) {
        print({ skipped: result.skipped }, `Skipped: ${result.skipped}`);
        return;
      }

      if (parsed.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(formatSnapshot(result.snapshot!));
      console.log("");
      if (result.changes) {
        console.log(formatPriceChanges(result.changes));
      } else {
        console.log(
          "Baseline snapshot saved. Day-over-day changes will appear after the next daily pull.",
        );
      }
      if (result.snapshotFile) console.log(`\nWrote ${result.snapshotFile}`);
      if (result.changesFile) console.log(`Wrote ${result.changesFile}`);
      break;
    }
    default:
      printHelp();
  }
}

main().catch((error: unknown) => {
  if (error instanceof WarframeMarketError) {
    console.error(`${error.message} [status=${error.status}]`);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
