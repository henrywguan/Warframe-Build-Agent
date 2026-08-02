import type {
  DailyMarketSnapshot,
  DailyPriceChanges,
  ItemPriceSnapshot,
} from "./types.js";

function plat(value?: number): string {
  return value === undefined ? "—" : `${value}p`;
}

function signed(value?: number, suffix = ""): string {
  if (value === undefined) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

export function formatItemPrice(item: ItemPriceSnapshot): string {
  const rankNote =
    item.rank === undefined ? "rank: n/a" : `rank: ${item.rank} (max seen in top orders)`;
  return [
    `${item.name ?? item.slug} (${item.slug}) — ${rankNote}`,
    `  Lowest sell: ${plat(item.lowestSell)} | median sell: ${plat(item.medianSell)} (${item.sellCount} top listings)`,
    `  Highest buy: ${plat(item.highestBuy)} | median buy: ${plat(item.medianBuy)} (${item.buyCount} top listings)`,
  ].join("\n");
}

export function formatSnapshot(snapshot: DailyMarketSnapshot): string {
  const lines = [
    `Warframe.market snapshot — ${snapshot.date} (${snapshot.timezone})`,
    `Platform: ${snapshot.platform} | Source: ${snapshot.source}`,
    `Pulled at: ${snapshot.pulledAt}`,
    "",
  ];
  for (const item of snapshot.items) {
    lines.push(formatItemPrice(item), "");
  }
  return lines.join("\n").trimEnd();
}

export function formatPriceChanges(changes: DailyPriceChanges): string {
  if (!changes.changes.length) {
    return `No comparable price changes between ${changes.previousDate} and ${changes.date}.`;
  }

  const lines = [
    `Warframe.market daily changes — ${changes.previousDate} → ${changes.date}`,
    `Timezone: ${changes.timezone} | Platform: ${changes.platform}`,
    `Source: ${changes.source}`,
    "",
    "Sorted by largest |%| move in lowest sell (fallback: highest buy).",
    "",
  ];

  for (const change of changes.changes) {
    lines.push(`• ${change.name ?? change.slug}`);
    lines.push(
      `  Lowest sell: ${plat(change.previousLowestSell)} → ${plat(change.currentLowestSell)} (${signed(change.lowestSellDelta, "p")}, ${signed(change.lowestSellDeltaPct, "%")})`,
    );
    lines.push(
      `  Highest buy: ${plat(change.previousHighestBuy)} → ${plat(change.currentHighestBuy)} (${signed(change.highestBuyDelta, "p")}, ${signed(change.highestBuyDeltaPct, "%")})`,
    );
  }

  lines.push(
    "",
    "Prices are live listing snapshots, not guaranteed sale clears. Re-check before big trades.",
  );
  return lines.join("\n");
}
