import { loadDailyJson } from "@/lib/daily-data";

const STATUS_BASE = "https://api.warframestat.us";
const MARKET_BASE = "https://api.warframe.market/v2";
const PATCH_NOTES_URL = "https://www.warframe.com/en/patch-notes";

type PatchType = "Hotfix" | "Update" | "Other";

interface PatchEntry {
  id: string;
  title: string;
  url: string;
  type: PatchType;
  newest: boolean;
  version?: string;
}

interface DailyPatchChanges {
  previousDate?: string;
  date?: string;
  newEntries?: PatchEntry[];
  latest?: PatchEntry | null;
  source?: string;
}

interface DailyMarketChanges {
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
}

const PATCH_ENTRY_RE =
  /<li>\s*(?:<span class="tag"><span class="label">([^<]+)<\/span><\/span>\s*)?<a href="(https:\/\/www\.warframe\.com\/en\/patch-notes\/pc\/[^"]+|\/patch-notes\/pc\/[^"]+)">([^<]+)<\/a>/gi;

function absolutizePatchHref(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  const pathName = href.startsWith("/") ? href : `/${href}`;
  if (pathName.startsWith("/patch-notes/")) {
    return `https://www.warframe.com/en${pathName}`;
  }
  return `https://www.warframe.com${pathName}`;
}

function classifyPatch(title: string): PatchType {
  if (/hotfix/i.test(title)) return "Hotfix";
  if (/\bupdate\s+\d+/i.test(title)) return "Update";
  return "Other";
}

function versionFromPatch(title: string, id: string): string | undefined {
  const fromTitle = title.match(/\b(\d+\.\d+\.\d+(?:\.\d+)?)\b/);
  if (fromTitle?.[1]) return fromTitle[1];
  const fromId = id.match(/^(\d+)-(\d+)-(\d+)(?:-(\d+))?$/);
  if (!fromId) return undefined;
  return [fromId[1], fromId[2], fromId[3], fromId[4]].filter(Boolean).join(".");
}

function parsePatchNotesHtml(html: string): PatchEntry[] {
  const seen = new Set<string>();
  const entries: PatchEntry[] = [];
  for (const match of html.matchAll(PATCH_ENTRY_RE)) {
    const label = (match[1] ?? "").trim();
    const url = absolutizePatchHref(match[2] ?? "");
    const title = (match[3] ?? "").trim();
    if (!url || !title) continue;
    const id = url.replace(/\/$/, "").split("/").pop() || url;
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({
      id,
      title,
      url,
      type: classifyPatch(title),
      newest: /^newest$/i.test(label),
      version: versionFromPatch(title, id),
    });
  }
  return entries;
}

function formatPatchEntry(entry: PatchEntry): string {
  const newest = entry.newest ? " [Newest]" : "";
  const version = entry.version ? ` (${entry.version})` : "";
  return `• ${entry.type}${newest}: ${entry.title}${version}\n   ${entry.url}`;
}

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
  const loaded = await loadDailyJson<DailyMarketChanges>({
    envUrl: process.env.MARKET_CHANGES_URL,
    envName: "MARKET_CHANGES_URL",
    localRelativePaths: ["data/market/latest-changes.json"],
    missingHint:
      "Saved daily market changes are not configured for this web deploy. Set MARKET_CHANGES_URL to the raw latest-changes.json from the daily market job, or ask for a live get_market_price instead.",
  });
  if (!loaded.ok) return loaded.error;

  const changes = loaded.data;
  if (!changes.changes?.length) {
    return [
      `No comparable price changes between ${changes.previousDate ?? "?"} and ${changes.date ?? "?"}.`,
      `Source: ${loaded.source}`,
      "Tip: day-over-day diffs appear after the second daily 4pm Pacific market pull.",
    ].join("\n");
  }

  const lines = [
    `Warframe.market daily changes — ${changes.previousDate} → ${changes.date}`,
    `Source: ${loaded.source}`,
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

export async function livePatchNotesLatest(limit = 8): Promise<string> {
  const response = await fetch(PATCH_NOTES_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "warframe-build-agent-web/0.1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    // Fall back to the committed daily snapshot when the live hub is unreachable.
    const loaded = await loadDailyJson<{
      date?: string;
      entries?: PatchEntry[];
      source?: string;
    }>({
      envUrl: process.env.PATCH_SNAPSHOT_URL,
      envName: "PATCH_SNAPSHOT_URL",
      localRelativePaths: ["data/patches/latest-snapshot.json"],
      missingHint: `Could not fetch official patch notes (HTTP ${response.status}), and no PATCH_SNAPSHOT_URL / local snapshot is available.`,
    });
    if (!loaded.ok) return loaded.error;
    const entries = loaded.data.entries ?? [];
    if (!entries.length) return "No patch-note entries in the saved snapshot.";
    return [
      `Warframe patch notes (saved snapshot ${loaded.data.date ?? "?"})`,
      `Source: ${loaded.source}`,
      "",
      ...entries.slice(0, limit).map(formatPatchEntry),
      "",
      "Open the linked notes for full details. Hub listing can change after hotfixes.",
    ].join("\n");
  }

  const entries = parsePatchNotesHtml(await response.text());
  if (!entries.length) {
    return "Fetched the patch-notes hub, but no PC Update/Hotfix entries parsed. The page markup may have changed.";
  }

  const newest = entries.find((entry) => entry.newest);
  const lines = [
    "Warframe patch notes (live hub)",
    `Source: ${PATCH_NOTES_URL}`,
    "",
  ];
  if (newest) {
    lines.push("Latest marked Newest:", formatPatchEntry(newest), "");
  }
  lines.push(`Recent entries (showing ${Math.min(limit, entries.length)}):`);
  for (const entry of entries.slice(0, limit)) {
    lines.push(formatPatchEntry(entry));
  }
  lines.push(
    "",
    "Open the linked notes for full details. Listing snapshots only — not full patch text.",
  );
  return lines.join("\n");
}

export async function liveBaro(): Promise<string> {
  const trader = await statusGet<{
    character?: string;
    location?: string;
    active?: boolean;
    activation?: string;
    expiry?: string;
    inventory?: Array<{
      item?: string;
      ducats?: number;
      credits?: number;
    }>;
  }>("voidTrader");

  if (!trader?.character && !trader?.location) {
    return "No Void Trader (Baro) data available.";
  }

  const arriving = trader.activation
    ? Date.parse(trader.activation) > Date.now()
    : false;
  const active =
    typeof trader.active === "boolean"
      ? trader.active
      : !arriving && !!trader.expiry && Date.parse(trader.expiry) > Date.now();

  const lines = [
    `${trader.character ?? "Baro Ki'Teer"} @ ${trader.location ?? "?"}`,
    active
      ? `Present — leaves in ${humanizeExpiry(trader.expiry)}`
      : `Not present — arrives in ${humanizeExpiry(trader.activation)}`,
  ];

  const inventory = trader.inventory ?? [];
  if (active && inventory.length) {
    lines.push(`Inventory (${inventory.length} items):`);
    for (const item of inventory.slice(0, 25)) {
      lines.push(
        `• ${item.item ?? "item"} — ${item.ducats ?? "?"} ducats / ${item.credits?.toLocaleString() ?? "?"} credits`,
      );
    }
    if (inventory.length > 25) {
      lines.push(`…and ${inventory.length - 25} more`);
    }
  } else if (!active) {
    lines.push("Inventory listed when Baro is present.");
  }

  lines.push("", "Source: api.warframestat.us (platform: pc) — timers can shift.");
  return lines.join("\n");
}

export async function liveNightwave(): Promise<string> {
  const nightwave = await statusGet<{
    season?: number;
    phase?: number;
    expiry?: string;
    activeChallenges?: Array<{
      title?: string;
      desc?: string;
      reputation?: number;
      isDaily?: boolean;
      isElite?: boolean;
    }>;
  }>("nightwave");

  if (!nightwave) return "No Nightwave data available.";
  const challenges = nightwave.activeChallenges ?? [];
  const lines = [
    `Nightwave — season ${nightwave.season ?? "?"} / phase ${nightwave.phase ?? "?"}`,
    `Timer: ${humanizeExpiry(nightwave.expiry)}`,
    `Active challenges (${challenges.length}):`,
  ];
  if (!challenges.length) {
    lines.push("  None listed.");
  } else {
    for (const challenge of challenges) {
      const tags = [
        challenge.isDaily ? "daily" : "weekly",
        challenge.isElite ? "elite" : null,
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(
        `• ${challenge.title ?? "Challenge"} [${tags}] — ${challenge.reputation ?? "?"} standing`,
      );
      if (challenge.desc) lines.push(`   ${challenge.desc}`);
    }
  }
  lines.push("", "Source: api.warframestat.us (platform: pc)");
  return lines.join("\n");
}

export async function liveArchonHunt(): Promise<string> {
  const hunt = await statusGet<{
    boss?: string;
    faction?: string;
    expiry?: string;
    missions?: Array<{ type?: string; typeKey?: string; node?: string }>;
  }>("archonHunt");

  if (!hunt?.boss) return "No Archon Hunt data available.";
  const lines = [
    `Archon Hunt — ${hunt.boss}`,
    `Faction: ${hunt.faction ?? "?"}`,
    `Timer: ${humanizeExpiry(hunt.expiry)}`,
    "Missions:",
  ];
  for (const [i, mission] of (hunt.missions ?? []).entries()) {
    lines.push(
      `  ${i + 1}. ${mission.type ?? mission.typeKey ?? "Mission"} @ ${mission.node ?? "?"}`,
    );
  }
  lines.push("", "Source: api.warframestat.us (platform: pc)");
  return lines.join("\n");
}

export async function liveArbitration(): Promise<string> {
  const arb = await statusGet<{
    node?: string;
    nodeKey?: string;
    type?: string;
    enemy?: string;
    faction?: string;
    expiry?: string;
    archwing?: boolean;
    sharkwing?: boolean;
    expired?: boolean;
  }>("arbitration");

  if (isInactiveArbitration(arb)) {
    return [
      "No active Arbitration right now (Status returned an empty placeholder).",
      "Arbitrations rotate frequently — re-check with /arbitration",
      "Tip when live: SP-ready AOE + enemy radar; rewards rotate (Endo / mods / Ayatan).",
      "",
      "Source: api.warframestat.us (platform: pc)",
    ].join("\n");
  }

  const flags = [
    arb.archwing ? "Archwing" : null,
    arb.sharkwing ? "Sharkwing" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const lines = [
    `Arbitration — ${arb.type ?? "Mission"} @ ${arb.node ?? "?"}`,
    `Enemy / faction: ${arb.enemy ?? arb.faction ?? "?"}`,
    flags ? `Flags: ${flags}` : null,
    `Timer: ${humanizeExpiry(arb.expiry)}`,
    "",
    "Tip: bring SP-ready AOE + enemy radar; reward rotates (Endo / mods / Ayatan).",
    "",
    "Source: api.warframestat.us (platform: pc) — timers can shift.",
  ].filter(Boolean) as string[];

  return lines.join("\n");
}

function isInactiveArbitration(arb: {
  node?: string;
  nodeKey?: string;
  type?: string;
  expired?: boolean;
} | null | undefined): boolean {
  return (
    !arb ||
    arb.expired === true ||
    arb.nodeKey === "SolNode000" ||
    arb.node === "SolNode000" ||
    /^unknown$/i.test(arb.type ?? "") ||
    (!arb.node && !arb.type)
  );
}

export async function liveDailyDeals(): Promise<string> {
  const deals = await statusGet<
    Array<{
      item?: string;
      originalPrice?: number;
      salePrice?: number;
      total?: number;
      sold?: number;
      expiry?: string;
      discount?: number;
    }>
  >("dailyDeals");

  if (!deals?.length) return "No Darvo daily deals listed.";

  const lines = ["Darvo daily deals:", ""];
  for (const deal of deals) {
    const sold =
      typeof deal.sold === "number" && typeof deal.total === "number"
        ? `${deal.sold}/${deal.total} sold`
        : "stock n/a";
    const disc =
      typeof deal.discount === "number"
        ? `${Math.round(deal.discount * 100)}% off`
        : "sale";
    lines.push(
      `• ${deal.item ?? "item"} — ${deal.salePrice ?? "?"}p (was ${deal.originalPrice ?? "?"}p, ${disc}) · ${sold} · ${humanizeExpiry(deal.expiry)}`,
    );
  }
  lines.push("", "Source: api.warframestat.us (platform: pc) — timers can shift.");
  return lines.join("\n");
}

export async function liveConstruction(): Promise<string> {
  const progress = await statusGet<{
    fomorianProgress?: number | string;
    razorbackProgress?: number | string;
    unknownProgress?: number | string;
  }>("constructionProgress");

  if (!progress) return "No construction progress data.";

  const lines = [
    "Invasion construction progress",
    `• Fomorian: ${progress.fomorianProgress ?? "?"}%`,
    `• Razorback: ${progress.razorbackProgress ?? "?"}%`,
    progress.unknownProgress != null
      ? `• Other: ${progress.unknownProgress}%`
      : null,
    "",
    "Source: api.warframestat.us (platform: pc)",
  ].filter(Boolean) as string[];

  return lines.join("\n");
}

export async function liveEvents(): Promise<string> {
  const events = await statusGet<
    Array<{
      description?: string;
      tooltip?: string;
      expiry?: string;
      health?: number;
      currentScore?: number;
      maximumScore?: number;
    }>
  >("events");

  if (!events?.length) return "No events listed.";
  const lines = ["Active events (platform: pc)", ""];
  for (const event of events) {
    const title = event.description ?? event.tooltip ?? "Event";
    const progress =
      typeof event.health === "number"
        ? `health ${event.health}`
        : typeof event.currentScore === "number" &&
            typeof event.maximumScore === "number"
          ? `score ${event.currentScore}/${event.maximumScore}`
          : null;
    lines.push(
      `• ${title}${progress ? ` (${progress})` : ""} — ${humanizeExpiry(event.expiry)}`,
    );
  }
  lines.push("", "Source: api.warframestat.us — timers can shift.");
  return lines.join("\n");
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

export async function liveMarketSlugSearch(query: string): Promise<string> {
  const items = await marketGet<
    Array<{
      slug: string;
      i18n?: Record<string, { name?: string }>;
    }>
  >("/items");

  const scored = items
    .map((item) => {
      const name = item.i18n?.en?.name ?? item.slug;
      return {
        slug: item.slug,
        name,
        score: scoreMarketName(query, name, item.slug),
      };
    })
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 12);

  if (!scored.length) {
    return [
      `No Warframe.market slug match for “${query}”.`,
      "Try a shorter name, or browse https://warframe.market",
    ].join("\n");
  }

  const lines = [
    `Warframe.market slug search — “${query}”`,
    "",
    ...scored.map((row) => `• ${row.name} → ${row.slug}`),
    "",
    "Next: /market <slug>",
  ];
  return lines.join("\n");
}

export async function livePatchNotesDailyChanges(): Promise<string> {
  const loaded = await loadDailyJson<DailyPatchChanges>({
    envUrl: process.env.PATCH_CHANGES_URL,
    envName: "PATCH_CHANGES_URL",
    localRelativePaths: ["data/patches/latest-changes.json"],
    missingHint:
      "Saved daily patch-note changes are not configured yet. Set PATCH_CHANGES_URL to the raw latest-changes.json from the daily patch job, or use get_patch_notes_latest for the live hub listing. Day-over-day diffs appear after the second 4pm Pacific pull.",
  });
  if (!loaded.ok) return loaded.error;

  const changes = loaded.data;
  const newEntries = changes.newEntries ?? [];
  if (!newEntries.length) {
    return [
      `No newly listed updates/hotfixes between ${changes.previousDate ?? "?"} and ${changes.date ?? "?"}.`,
      `Source: ${loaded.source}`,
      changes.latest
        ? `Still newest on hub: ${changes.latest.type} ${changes.latest.title} — ${changes.latest.url}`
        : "Tip: use get_patch_notes_latest for the current hub listing.",
    ].join("\n");
  }

  const lines = [
    `Warframe patch notes — newly listed ${changes.previousDate} → ${changes.date}`,
    `Source: ${loaded.source}`,
    "",
    ...newEntries.map(formatPatchEntry),
    "",
    "These are newly listed hub entries since the previous daily snapshot. Open links for full notes.",
  ];
  return lines.join("\n");
}
