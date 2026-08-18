#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WarframeMarketClient, WarframeMarketError } from "./client.js";
import { formatItemPrice, formatPriceChanges, formatSnapshot } from "./format.js";
import {
  filterIngameMaxedSells,
  formatAmbiguousSlugs,
  formatNoIngameSellers,
  formatQuotesCli,
  itemLooksLikeRiven,
  itemMaxRank,
  marketItemUrl,
  pickMarketSlug,
  toMarketQuoteRows,
  type MarketQuotesPayload,
} from "./ingame-quotes.js";
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
  "slug-search",
  "wfm",
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
  query?: string;
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
  price <slug>            Live top-order summary for one item
  slug-search <query>     Fuzzy item name → market slug
  wfm <query>             In-game max-rank sell quotes + /w whisper lines
  snapshot                Pull watchlist snapshot now (no timezone gate)
  changes                 Show latest saved day-over-day changes
  pull                    Daily job: snapshot at 4pm Pacific, write changes
  status                  Show Pacific time / pull-window status
  help                    Show help

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
        if (
          (parsed.command === "price" ||
            parsed.command === "slug-search" ||
            parsed.command === "wfm") &&
          !parsed.slug &&
          !parsed.query &&
          !token.startsWith("-")
        ) {
          if (parsed.command === "price") parsed.slug = token;
          else {
            parsed.query = [token, ...args].join(" ").trim();
            args.length = 0;
          }
          break;
        }
        throw new Error(`Unknown option or argument "${token}"`);
    }
  }

  return parsed;
}

function scoreMarketName(query: string, name: string, slug: string): number {
  const q = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const s = slug.toLowerCase().replace(/_/g, " ");
  if (!q) return 0;
  if (n === q || s === q) return 100;
  if (slug === query.toLowerCase().replace(/\s+/g, "_")) return 95;
  if (n.startsWith(q) || s.startsWith(q)) return 80;
  if (n.includes(q) || s.includes(q)) return 60;
  const qTokens = q.split(" ").filter(Boolean);
  const nTokens = new Set(n.split(" ").filter(Boolean));
  return qTokens.filter((t) => nTokens.has(t)).length * 18;
}

async function runWfmQuotes(
  query: string,
  platform?: MarketPlatform,
): Promise<{ text: string; payload?: MarketQuotesPayload }> {
  const client = new WarframeMarketClient({ platform });
  const catalog = await client.listItems();
  const pick = pickMarketSlug(
    query,
    catalog.map((item) => ({
      slug: item.slug,
      name: item.i18n?.en?.name ?? item.slug,
    })),
  );
  if (pick.kind === "none") {
    return { text: `No Warframe.market slug match for “${query}”.` };
  }
  if (pick.kind === "ambiguous") {
    return { text: formatAmbiguousSlugs(query, pick.matches) };
  }

  const slug = pick.match.slug;
  const item = await client.getItem(slug).catch(() => null);
  const itemName = item?.i18n?.en?.name ?? pick.match.name;
  if (itemLooksLikeRiven(slug, item?.tags)) {
    return {
      text: [
        `${itemName} is a Riven listing.`,
        "Rivens use Warframe.market auctions, not this sell-order book.",
      ].join("\n"),
    };
  }

  const maxRank = itemMaxRank(item);
  const { orders, source } = await client.getItemOrders(slug);
  const filtered = filterIngameMaxedSells(orders, maxRank);
  const payload: MarketQuotesPayload = {
    slug,
    itemName,
    ...(maxRank !== undefined ? { maxRank } : {}),
    source,
    fetchedAt: new Date().toISOString(),
    quotes: toMarketQuoteRows(filtered, itemName),
    url: marketItemUrl(slug),
  };
  if (!payload.quotes.length) {
    return {
      text: formatNoIngameSellers(itemName, slug, maxRank),
      payload,
    };
  }
  return { text: formatQuotesCli(payload), payload };
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
    case "slug-search": {
      if (!parsed.query) {
        throw new Error(
          'Command "slug-search" requires a query, e.g. npm run market -- slug-search "Mirage Prime set"',
        );
      }
      const client = new WarframeMarketClient({ platform: parsed.platform });
      const items = await client.listItems();
      const scored = items
        .map((item) => {
          const name = item.i18n?.en?.name ?? item.slug;
          return {
            slug: item.slug,
            name,
            score: scoreMarketName(parsed.query!, name, item.slug),
          };
        })
        .filter((row) => row.score >= 40)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, 12);
      const payload = { query: parsed.query, matches: scored };
      print(
        payload,
        scored.length
          ? [
              `Warframe.market slug search — “${parsed.query}”`,
              "",
              ...scored.map((row) => `• ${row.name} → ${row.slug}`),
              "",
              "Next: npm run market -- price <slug>",
            ].join("\n")
          : `No slug match for “${parsed.query}”.`,
      );
      break;
    }
    case "wfm": {
      if (!parsed.query) {
        throw new Error(
          'Command "wfm" requires a query, e.g. npm run market -- wfm "Primed Continuity"',
        );
      }
      const result = await runWfmQuotes(parsed.query, parsed.platform);
      print(result.payload ?? { query: parsed.query, error: result.text }, result.text);
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
