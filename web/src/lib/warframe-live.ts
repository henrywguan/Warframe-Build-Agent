const STATUS_BASE = "https://api.warframestat.us";
const MARKET_BASE = "https://api.warframe.market/v2";

async function statusGet<T>(pathName: string): Promise<T> {
  const url =
    pathName === ""
      ? new URL(`${STATUS_BASE}/pc`)
      : new URL(`${STATUS_BASE}/pc/${pathName.replace(/^\//, "")}`);
  url.searchParams.set("language", "en");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "warframe-build-agent-web/0.1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Warframe Status ${response.status} for ${pathName || "/pc"}`);
  }
  return (await response.json()) as T;
}

async function marketGet<T>(pathName: string): Promise<T> {
  const response = await fetch(`${MARKET_BASE}${pathName}`, {
    headers: {
      Accept: "application/json",
      Language: "en",
      Platform: "pc",
      "User-Agent": "warframe-build-agent-web/0.1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Warframe.market ${response.status} for ${pathName}`);
  }
  const body = (await response.json()) as { data: T; error: string | null };
  if (body.error) throw new Error(body.error);
  return body.data;
}

function humanizeExpiry(expiry?: string, now = Date.now()): string {
  if (!expiry) return "unknown timer";
  const ms = Date.parse(expiry) - now;
  if (Number.isNaN(ms)) return expiry;
  if (ms <= 0) return "expired";
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `~${totalMinutes}m left`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 48) return `~${hours}h ${minutes}m left`;
  const days = Math.floor(hours / 24);
  return `~${days}d ${hours % 24}h left`;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid];
}

function formatSigned(value?: number): string {
  if (value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value}`;
}

type Cycle = { state?: string; timeLeft?: string; expiry?: string };

export async function liveWorldstateSummary(): Promise<string> {
  const data = await statusGet<Record<string, unknown>>("");
  const fissures = (data.fissures as Array<{ isHard?: boolean }>) ?? [];
  const invasions = (data.invasions as Array<{ completed?: boolean }>) ?? [];
  const alerts = (data.alerts as unknown[]) ?? [];
  const events = (data.events as unknown[]) ?? [];
  const sortie =
    (data.sortie as {
      boss?: string;
      faction?: string;
      expiry?: string;
      variants?: Array<{
        missionType?: string;
        node?: string;
        modifier?: string;
      }>;
    }) ?? {};

  const lines = [
    "Warframe worldstate summary (platform: pc)",
    "Source: api.warframestat.us — timers can shift.",
    "",
    `Alerts: ${alerts.length}`,
    `Fissures: ${fissures.length} (${fissures.filter((f) => f.isHard).length} Steel Path)`,
    `Invasions: ${invasions.filter((i) => !i.completed).length} active`,
    `Events: ${events.length}`,
    "",
    `Sortie: ${sortie.boss ?? "?"} / ${sortie.faction ?? "?"} (${humanizeExpiry(sortie.expiry)})`,
  ];
  for (const [i, variant] of (sortie.variants ?? []).entries()) {
    lines.push(
      `  ${i + 1}. ${variant.missionType ?? "Mission"} @ ${variant.node ?? "?"} — ${variant.modifier ?? "modifier"}`,
    );
  }

  const cycleLines = formatCyclesFromWorldstate(data);
  lines.push("", "Cycles:", cycleLines);
  return lines.join("\n");
}

function formatCyclesFromWorldstate(data: Record<string, unknown>): string {
  const pairs: Array<[string, string]> = [
    ["cetusCycle", "Cetus / Plains"],
    ["vallisCycle", "Orb Vallis"],
    ["cambionCycle", "Cambion Drift"],
    ["earthCycle", "Earth"],
    ["zarimanCycle", "Zariman"],
    ["duviriCycle", "Duviri"],
  ];
  return pairs
    .map(([key, label]) => {
      const cycle = (data[key] as Cycle | undefined) ?? {};
      return `• ${label}: ${cycle.state ?? "unknown"} — ${cycle.timeLeft ?? humanizeExpiry(cycle.expiry)}`;
    })
    .join("\n");
}

export async function liveFissures(options: {
  steelPathOnly?: boolean;
  tier?: string;
}): Promise<string> {
  const fissures = await statusGet<
    Array<{
      tier?: string;
      missionType?: string;
      node?: string;
      enemy?: string;
      expiry?: string;
      isHard?: boolean;
      isStorm?: boolean;
    }>
  >("fissures");

  let list = fissures.filter((f) => !f.expiry || Date.parse(f.expiry) > Date.now());
  if (options.steelPathOnly) list = list.filter((f) => f.isHard);
  if (options.tier) {
    const wanted = options.tier.toLowerCase();
    list = list.filter((f) => (f.tier ?? "").toLowerCase() === wanted);
  }
  if (!list.length) return "No matching fissures right now.";
  return list
    .map((f) => {
      const pathLabel = f.isHard ? "Steel Path" : "Star Chart";
      const storm = f.isStorm ? " / Railjack" : "";
      return `• ${f.tier ?? "?"} ${f.missionType ?? "Mission"} @ ${f.node ?? "?"} (${f.enemy ?? "?"}) — ${pathLabel}${storm} — ${humanizeExpiry(f.expiry)}`;
    })
    .join("\n");
}

export async function liveCycles(): Promise<string> {
  const data = await statusGet<Record<string, unknown>>("");
  return formatCyclesFromWorldstate(data);
}

export async function liveSortie(): Promise<string> {
  const sortie = await statusGet<{
    boss?: string;
    faction?: string;
    expiry?: string;
    variants?: Array<{
      missionType?: string;
      node?: string;
      modifier?: string;
      modifierDescription?: string;
    }>;
  }>("sortie");
  const lines = [
    `Boss: ${sortie.boss ?? "?"}`,
    `Faction: ${sortie.faction ?? "?"}`,
    `Timer: ${humanizeExpiry(sortie.expiry)}`,
    "Missions:",
  ];
  for (const [i, variant] of (sortie.variants ?? []).entries()) {
    lines.push(
      `  ${i + 1}. ${variant.missionType ?? "Mission"} @ ${variant.node ?? "?"}`,
    );
    lines.push(
      `     ${variant.modifier ?? "modifier"}${variant.modifierDescription ? ` — ${variant.modifierDescription}` : ""}`,
    );
  }
  return lines.join("\n");
}

export async function liveInvasions(): Promise<string> {
  const invasions = await statusGet<
    Array<{
      node?: string;
      desc?: string;
      completion?: number;
      completed?: boolean;
      attacker?: { faction?: string; reward?: { items?: string[]; credits?: number } };
      defender?: { faction?: string; reward?: { items?: string[]; credits?: number } };
    }>
  >("invasions");
  const active = invasions.filter((i) => !i.completed);
  if (!active.length) return "No active invasions.";
  return active
    .map((inv) => {
      const attackerItems = inv.attacker?.reward?.items?.join(", ") || "no listed reward";
      const defenderItems = inv.defender?.reward?.items?.join(", ") || "no listed reward";
      return [
        `• ${inv.node ?? "Unknown"} — ${inv.desc ?? "Invasion"} (${typeof inv.completion === "number" ? `${inv.completion.toFixed(1)}%` : "n/a"})`,
        `   Attacker (${inv.attacker?.faction ?? "?"}): ${attackerItems}`,
        `   Defender (${inv.defender?.faction ?? "?"}): ${defenderItems}`,
      ].join("\n");
    })
    .join("\n");
}

export async function liveAlerts(): Promise<string> {
  const alerts = await statusGet<
    Array<{
      expiry?: string;
      mission?: {
        node?: string;
        type?: string;
        faction?: string;
        reward?: { items?: string[]; credits?: number };
      };
    }>
  >("alerts");
  if (!alerts.length) return "No alerts active.";
  return alerts
    .map((alert, index) => {
      const mission = alert.mission;
      const rewardBits = [
        ...(mission?.reward?.items ?? []),
        typeof mission?.reward?.credits === "number"
          ? `${mission.reward.credits.toLocaleString()} credits`
          : null,
      ].filter(Boolean);
      return [
        `${index + 1}. ${mission?.node ?? "Unknown node"} — ${mission?.type ?? "Mission"}`,
        `   Faction: ${mission?.faction ?? "?"}`,
        `   Reward: ${rewardBits.length ? rewardBits.join(", ") : "no listed reward"}`,
        `   ${humanizeExpiry(alert.expiry)}`,
      ].join("\n");
    })
    .join("\n");
}

export async function liveMarketPrice(slug: string): Promise<string> {
  const [item, orders] = await Promise.all([
    marketGet<{
      slug: string;
      i18n?: Record<string, { name?: string }>;
    }>(`/items/${encodeURIComponent(slug)}`).catch(() => null),
    marketGet<{
      sell: Array<{ platinum: number; rank?: number }>;
      buy: Array<{ platinum: number; rank?: number }>;
    }>(`/orders/item/${encodeURIComponent(slug)}/top`),
  ]);

  const sellRanks = (orders.sell ?? [])
    .map((o) => o.rank)
    .filter((r): r is number => typeof r === "number");
  const rank = sellRanks.length ? Math.max(...sellRanks) : undefined;
  const sell = (orders.sell ?? []).filter((o) => rank === undefined || o.rank === rank);
  const buy = (orders.buy ?? []).filter((o) => rank === undefined || o.rank === rank);
  const sellPrices = (sell.length ? sell : orders.sell ?? []).map((o) => o.platinum);
  const buyPrices = buy.map((o) => o.platinum);
  const name = item?.i18n?.en?.name ?? slug;
  const rankNote =
    rank === undefined ? "rank: n/a" : `rank: ${rank} (max sell rank in top orders)`;

  return [
    `${name} (${slug}) — ${rankNote}`,
    `  Lowest sell: ${sellPrices.length ? `${Math.min(...sellPrices)}p` : "—"} | median sell: ${median(sellPrices) ?? "—"} (${sellPrices.length} top listings)`,
    `  Highest buy: ${buyPrices.length ? `${Math.max(...buyPrices)}p` : "—"} | median buy: ${median(buyPrices) ?? "—"} (${buyPrices.length} top listings)`,
  ].join("\n");
}

export async function liveMarketDailyChanges(): Promise<string> {
  const url = process.env.MARKET_CHANGES_URL?.trim();
  if (!url) {
    return "Saved daily market changes are not configured for this web deploy. Set MARKET_CHANGES_URL to a JSON snapshot (for example the raw latest-changes.json from the repo), or ask for a live get_market_price instead.";
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return `Could not load MARKET_CHANGES_URL (HTTP ${response.status}).`;
  }

  const changes = (await response.json()) as {
    previousDate?: string;
    date?: string;
    changes?: Array<{
      name?: string;
      slug?: string;
      previousLowestSell?: number;
      currentLowestSell?: number;
      lowestSellDelta?: number;
      lowestSellDeltaPct?: number;
    }>;
  };

  if (!changes.changes?.length) {
    return `No comparable price changes between ${changes.previousDate} and ${changes.date}.`;
  }

  const lines = [
    `Warframe.market daily changes — ${changes.previousDate} → ${changes.date}`,
    "",
  ];
  for (const change of changes.changes.slice(0, 20)) {
    lines.push(
      `• ${change.name ?? change.slug}: ${change.previousLowestSell ?? "—"}p → ${change.currentLowestSell ?? "—"}p (${formatSigned(change.lowestSellDelta)}p, ${formatSigned(change.lowestSellDeltaPct)}%)`,
    );
  }
  lines.push("", "Listing snapshots only — re-check before big trades.");
  return lines.join("\n");
}
