import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { WarframeMarketClient } from "./client.js";
import {
  MARKET_API_BASE,
  MARKET_DAILY_PULL_HOUR,
  MARKET_DAILY_PULL_TIMEZONE,
  type DailyMarketSnapshot,
  type DailyPriceChanges,
  type ItemPriceChange,
  type ItemPriceSnapshot,
  type MarketPlatform,
  type MarketTopOrders,
  type MarketWatchlist,
} from "./types.js";

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid];
}

export function pacificDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKET_DAILY_PULL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function pacificHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_DAILY_PULL_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).format(now);
  // Some engines emit "24" for midnight; normalize.
  const parsed = Number(hour);
  return parsed === 24 ? 0 : parsed;
}

export function isDailyPullWindow(now = new Date()): boolean {
  return pacificHour(now) === MARKET_DAILY_PULL_HOUR;
}

function preferredRank(orders: MarketTopOrders): number | undefined {
  const sellRanks = (orders.sell ?? [])
    .map((order) => order.rank)
    .filter((rank): rank is number => typeof rank === "number");
  if (sellRanks.length) return Math.max(...sellRanks);

  const buyRanks = (orders.buy ?? [])
    .map((order) => order.rank)
    .filter((rank): rank is number => typeof rank === "number");
  if (!buyRanks.length) return undefined;
  return Math.max(...buyRanks);
}

export function summarizeTopOrders(
  slug: string,
  orders: MarketTopOrders,
  options: { name?: string; fetchedAt?: string } = {},
): ItemPriceSnapshot {
  const rank = preferredRank(orders);
  const sellOrders = (orders.sell ?? []).filter(
    (order) => rank === undefined || order.rank === rank,
  );
  const buyOrders = (orders.buy ?? []).filter(
    (order) => rank === undefined || order.rank === rank,
  );

  // If the preferred sell-rank filter empties sells, fall back to all sells.
  // Buys stay rank-matched so high-rank buy walls don't pollute unranked sell snapshots.
  const sellSource = sellOrders.length ? sellOrders : (orders.sell ?? []);
  const buySource = buyOrders;


  const sellPrices = sellSource
    .map((order) => order.platinum)
    .filter((n) => typeof n === "number");
  const buyPrices = buySource
    .map((order) => order.platinum)
    .filter((n) => typeof n === "number");

  return {
    slug,
    name: options.name,
    rank,
    lowestSell: sellPrices.length ? Math.min(...sellPrices) : undefined,
    highestBuy: buyPrices.length ? Math.max(...buyPrices) : undefined,
    medianSell: median(sellPrices),
    medianBuy: median(buyPrices),
    sellCount: sellPrices.length,
    buyCount: buyPrices.length,
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
  };
}

function delta(current?: number, previous?: number): number | undefined {
  if (current === undefined || previous === undefined) return undefined;
  return Number((current - previous).toFixed(2));
}

function deltaPct(current?: number, previous?: number): number | undefined {
  if (current === undefined || previous === undefined || previous === 0) {
    return undefined;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function computePriceChanges(
  previous: DailyMarketSnapshot,
  current: DailyMarketSnapshot,
): DailyPriceChanges {
  const previousBySlug = new Map(previous.items.map((item) => [item.slug, item]));
  const changes: ItemPriceChange[] = [];

  for (const item of current.items) {
    const prior = previousBySlug.get(item.slug);
    if (!prior) continue;
    changes.push({
      slug: item.slug,
      name: item.name ?? prior.name,
      previousDate: previous.date,
      currentDate: current.date,
      previousLowestSell: prior.lowestSell,
      currentLowestSell: item.lowestSell,
      lowestSellDelta: delta(item.lowestSell, prior.lowestSell),
      lowestSellDeltaPct: deltaPct(item.lowestSell, prior.lowestSell),
      previousHighestBuy: prior.highestBuy,
      currentHighestBuy: item.highestBuy,
      highestBuyDelta: delta(item.highestBuy, prior.highestBuy),
      highestBuyDeltaPct: deltaPct(item.highestBuy, prior.highestBuy),
    });
  }

  changes.sort((a, b) => {
    const aMag = Math.abs(a.lowestSellDeltaPct ?? a.highestBuyDeltaPct ?? 0);
    const bMag = Math.abs(b.lowestSellDeltaPct ?? b.highestBuyDeltaPct ?? 0);
    return bMag - aMag;
  });

  return {
    date: current.date,
    previousDate: previous.date,
    timezone: current.timezone,
    generatedAt: new Date().toISOString(),
    platform: current.platform,
    source: current.source,
    changes,
  };
}

export async function loadWatchlist(filePath: string): Promise<MarketWatchlist> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as MarketWatchlist;
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error(`Watchlist at ${filePath} must include a non-empty items array`);
  }
  return {
    ...parsed,
    items: [...new Set(parsed.items.map((slug) => slug.trim()).filter(Boolean))],
  };
}

export function snapshotPath(dataDir: string, date: string): string {
  return path.join(dataDir, `snapshot-${date}.json`);
}

export function changesPath(dataDir: string, date: string): string {
  return path.join(dataDir, `changes-${date}.json`);
}

export async function readSnapshot(
  dataDir: string,
  date: string,
): Promise<DailyMarketSnapshot | null> {
  try {
    const raw = await readFile(snapshotPath(dataDir, date), "utf8");
    return JSON.parse(raw) as DailyMarketSnapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function findPreviousSnapshot(
  dataDir: string,
  beforeDate: string,
): Promise<DailyMarketSnapshot | null> {
  let names: string[];
  try {
    names = await readdir(dataDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }

  const dates = names
    .map((name) => name.match(/^snapshot-(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
    .filter((date): date is string => !!date && date < beforeDate)
    .sort();

  const previousDate = dates.at(-1);
  if (!previousDate) return null;
  return readSnapshot(dataDir, previousDate);
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function buildDailySnapshot(options: {
  client?: WarframeMarketClient;
  slugs: string[];
  platform?: MarketPlatform;
  now?: Date;
}): Promise<DailyMarketSnapshot> {
  const now = options.now ?? new Date();
  const client =
    options.client ??
    new WarframeMarketClient({ platform: options.platform });
  const pulledAt = now.toISOString();
  const items: ItemPriceSnapshot[] = [];

  const nameBySlug = new Map<string, string>();
  try {
    const catalog = await client.listItems();
    for (const item of catalog) {
      nameBySlug.set(item.slug, item.i18n?.en?.name ?? item.slug);
    }
  } catch {
    // Names are optional; top-order pull can still succeed.
  }

  for (const [index, slug] of options.slugs.entries()) {
    if (index > 0 && client.requestGapMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, client.requestGapMs));
    }

    const orders = await client.getTopOrders(slug);
    items.push(
      summarizeTopOrders(slug, orders, {
        name: nameBySlug.get(slug) ?? slug,
        fetchedAt: new Date().toISOString(),
      }),
    );
  }

  return {
    date: pacificDateString(now),
    timezone: MARKET_DAILY_PULL_TIMEZONE,
    pulledAt,
    platform: options.platform ?? client.platform,
    source: MARKET_API_BASE,
    items,
  };
}

export async function runDailyPricePull(options: {
  watchlistPath: string;
  dataDir: string;
  client?: WarframeMarketClient;
  now?: Date;
  requirePullWindow?: boolean;
}): Promise<{
  skipped?: string;
  snapshot: DailyMarketSnapshot | null;
  changes: DailyPriceChanges | null;
  snapshotFile?: string;
  changesFile?: string;
  latestSnapshotFile?: string;
  latestChangesFile?: string;
}> {
  const now = options.now ?? new Date();
  if (options.requirePullWindow && !isDailyPullWindow(now)) {
    return {
      skipped: `Outside ${MARKET_DAILY_PULL_HOUR}:00 ${MARKET_DAILY_PULL_TIMEZONE} pull window`,
      snapshot: null,
      changes: null,
    };
  }

  const watchlist = await loadWatchlist(options.watchlistPath);
  const snapshot = await buildDailySnapshot({
    client: options.client,
    slugs: watchlist.items,
    platform: watchlist.platform,
    now,
  });

  const snapshotFile = snapshotPath(options.dataDir, snapshot.date);
  await writeJson(snapshotFile, snapshot);

  const latestSnapshotFile = path.join(options.dataDir, "latest-snapshot.json");
  await writeJson(latestSnapshotFile, snapshot);

  const previous = await findPreviousSnapshot(options.dataDir, snapshot.date);
  let changes: DailyPriceChanges | null = null;
  let changesFile: string | undefined;
  let latestChangesFile: string | undefined;

  if (previous) {
    changes = computePriceChanges(previous, snapshot);
    changesFile = changesPath(options.dataDir, snapshot.date);
    await writeJson(changesFile, changes);
    latestChangesFile = path.join(options.dataDir, "latest-changes.json");
    await writeJson(latestChangesFile, changes);
  }

  return {
    snapshot,
    changes,
    snapshotFile,
    changesFile,
    latestSnapshotFile,
    latestChangesFile,
  };
}
