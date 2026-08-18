/** In-game Warframe.market sell quotes + whisper copy (web). */

export const MARKET_QUOTE_LIMIT = 5;
export const MARKET_QUOTES_STORAGE_KEY = "wfba_market_quotes_ui_v1";
export const MARKET_QUOTES_MARKER_START = "---MARKET_QUOTES---";
export const MARKET_QUOTES_MARKER_END = "---END_MARKET_QUOTES---";

export type MarketOrderBookSource = "full" | "top";

export interface MarketOrderLike {
  id?: string;
  type?: string;
  platinum: number;
  quantity?: number;
  rank?: number | null;
  visible?: boolean;
  user?: {
    ingameName?: string;
    reputation?: number;
    status?: string;
  };
}

export interface MarketQuoteRow {
  ign: string;
  platinum: number;
  quantity: number;
  rank?: number;
  reputation?: number;
  whisper: string;
}

export interface MarketQuotesPayload {
  slug: string;
  itemName: string;
  maxRank?: number;
  source: MarketOrderBookSource;
  fetchedAt: string;
  quotes: MarketQuoteRow[];
  url: string;
}

export interface MarketSlugMatch {
  slug: string;
  name: string;
  score: number;
}

export type MarketSlugPick =
  | { kind: "pick"; match: MarketSlugMatch }
  | { kind: "ambiguous"; matches: MarketSlugMatch[] }
  | { kind: "none" };

export function normalizeMarketOrders(data: unknown): MarketOrderLike[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as MarketOrderLike[];
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.orders)) return obj.orders as MarketOrderLike[];
    const sell = Array.isArray(obj.sell) ? (obj.sell as MarketOrderLike[]) : [];
    const buy = Array.isArray(obj.buy) ? (obj.buy as MarketOrderLike[]) : [];
    return [...sell, ...buy];
  }
  return [];
}

export function itemMaxRank(item: {
  maxRank?: number;
  modMaxRank?: number;
} | null | undefined): number | undefined {
  if (!item) return undefined;
  for (const value of [item.maxRank, item.modMaxRank]) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

export function itemLooksLikeRiven(slug: string, tags?: string[] | null): boolean {
  if (/riven/i.test(slug)) return true;
  return (tags ?? []).some((tag) => /riven/i.test(tag));
}

export function formatMarketWhisper(input: {
  ign: string;
  itemName: string;
  platinum: number;
  rank?: number;
}): string {
  const itemToken =
    typeof input.rank === "number"
      ? `"${input.itemName} (rank ${input.rank})"`
      : `"${input.itemName}"`;
  return `/w ${input.ign} Hi! I want to buy: ${itemToken} for ${input.platinum} platinum. (warframe.market)`;
}

export function filterIngameMaxedSells(
  orders: MarketOrderLike[],
  maxRank?: number,
  limit = MARKET_QUOTE_LIMIT,
): MarketOrderLike[] {
  const filtered = orders.filter((order) => {
    if (String(order.type ?? "").toLowerCase() !== "sell") return false;
    if (order.visible === false) return false;
    if (order.user?.status !== "ingame") return false;
    if (!order.user?.ingameName?.trim()) return false;
    if (typeof maxRank === "number") return order.rank === maxRank;
    return order.rank === undefined || order.rank === null;
  });

  filtered.sort((a, b) => {
    const plat = (a.platinum ?? 0) - (b.platinum ?? 0);
    if (plat !== 0) return plat;
    return (b.quantity ?? 0) - (a.quantity ?? 0);
  });

  return filtered.slice(0, limit);
}

export function toMarketQuoteRows(
  orders: MarketOrderLike[],
  itemName: string,
): MarketQuoteRow[] {
  return orders.map((order) => {
    const ign = order.user?.ingameName?.trim() ?? "";
    const platinum = order.platinum;
    const rank = typeof order.rank === "number" ? order.rank : undefined;
    return {
      ign,
      platinum,
      quantity: order.quantity ?? 1,
      ...(rank !== undefined ? { rank } : {}),
      ...(typeof order.user?.reputation === "number"
        ? { reputation: order.user.reputation }
        : {}),
      whisper: formatMarketWhisper({ ign, itemName, platinum, rank }),
    };
  });
}

export function scoreMarketName(query: string, name: string, slug: string): number {
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

export function pickMarketSlug(
  query: string,
  items: Array<{ slug: string; name: string }>,
): MarketSlugPick {
  const scored = items
    .map((item) => ({
      slug: item.slug,
      name: item.name,
      score: scoreMarketName(query, item.name, item.slug),
    }))
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  if (!scored.length) return { kind: "none" };

  const top = scored[0]!;
  const second = scored[1];
  const uniqueTop = !second || second.score < top.score;
  const autoPick =
    top.score >= 95 ||
    (top.score >= 80 && uniqueTop) ||
    scored.length === 1;

  if (autoPick) return { kind: "pick", match: top };
  return { kind: "ambiguous", matches: scored.slice(0, 8) };
}

export function marketItemUrl(slug: string): string {
  return `https://warframe.market/items/${slug}`;
}

export function formatQuotesOpened(payload: MarketQuotesPayload): string {
  const rankNote =
    payload.maxRank === undefined
      ? "unranked (no maxRank on item)"
      : `max rank ${payload.maxRank}`;
  const caveat =
    payload.source === "top" && payload.quotes.length < MARKET_QUOTE_LIMIT
      ? `Using truncated top-order book (full sell book unavailable). Only ${payload.quotes.length} in-game maxed sell${payload.quotes.length === 1 ? "" : "s"} found.`
      : null;
  const lines = [
    `In-game sellers for **${payload.itemName}** (${rankNote})`,
    "",
    ...payload.quotes.map((row) => `• ${row.ign} · ${row.platinum}p`),
    "",
    "Opened Market Quotes panel — Buy pastes `/w IGN …` (confirm in-game).",
  ];
  if (caveat) lines.splice(2, 0, caveat, "");
  lines.push(
    "Listings change quickly. **In-game** is Warframe.market status, not a guaranteed trade.",
  );
  return lines.join("\n");
}

export function formatNoIngameSellers(
  itemName: string,
  slug: string,
  maxRank?: number,
): string {
  const rankNote = maxRank === undefined ? "unranked" : `max rank ${maxRank}`;
  return [
    `No in-game ${rankNote} sellers for **${itemName}** right now.`,
    `Try \`/market ${slug}\` for a price summary, or retry in a minute.`,
    "Listings change quickly; in-game means Warframe.market status, not a guaranteed trade.",
  ].join("\n");
}

export function formatAmbiguousSlugs(
  query: string,
  matches: MarketSlugMatch[],
): string {
  return [
    `Several Warframe.market matches for “${query}”. Pick one slug, then retry \`/wfm <slug>\`.`,
    "",
    ...matches.map((row) => `• ${row.name} → \`${row.slug}\``),
    "",
    "The quotes panel stays closed until a single item is chosen.",
  ].join("\n");
}

export function isMarketQuotesPayload(value: unknown): value is MarketQuotesPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as MarketQuotesPayload;
  return (
    typeof row.slug === "string" &&
    typeof row.itemName === "string" &&
    Array.isArray(row.quotes)
  );
}

export function encodeMarketQuotesToolResult(input: {
  content: string;
  quotes?: MarketQuotesPayload;
}): string {
  if (!input.quotes) return input.content;
  return [
    input.content,
    MARKET_QUOTES_MARKER_START,
    JSON.stringify(input.quotes),
    MARKET_QUOTES_MARKER_END,
  ].join("\n");
}

export function extractMarketQuotesFromToolOutput(
  text: string,
): MarketQuotesPayload | null {
  const start = text.indexOf(MARKET_QUOTES_MARKER_START);
  const end = text.indexOf(MARKET_QUOTES_MARKER_END);
  if (start < 0 || end < 0 || end <= start) return null;
  const json = text
    .slice(start + MARKET_QUOTES_MARKER_START.length, end)
    .trim();
  try {
    const parsed = JSON.parse(json) as unknown;
    return isMarketQuotesPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function extractMarketQuotesFromToolPayloads(
  payloads: string[],
): MarketQuotesPayload | null {
  for (let i = payloads.length - 1; i >= 0; i -= 1) {
    const hit = extractMarketQuotesFromToolOutput(payloads[i] || "");
    if (hit) return hit;
  }
  return null;
}

export function stripMarketQuotesMarker(text: string): string {
  const start = text.indexOf(MARKET_QUOTES_MARKER_START);
  if (start < 0) return text;
  const end = text.indexOf(MARKET_QUOTES_MARKER_END);
  if (end < 0) return text.slice(0, start).trim();
  return `${text.slice(0, start).trim()}\n${text.slice(end + MARKET_QUOTES_MARKER_END.length).trim()}`.trim();
}

const FARM_VS_BUY = /\bfarm\s*(?:vs\.?|versus|or)\s*buy\b/i;

const SELLER_INTENT =
  /\b(?:in-?game\s+sellers?|copy\s+whispers?|whisper\s+(?:copy|text|lines?)|wfm|warframe\.market)\b|\b(?:find|show|list|get)\b.{0,40}\b(?:in-?game\s+)?(?:sellers?|listings?)\b|\bwhispers?\s+for\b/i;

export function looksLikeMarketSellerRequest(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || FARM_VS_BUY.test(trimmed)) return false;
  if (/^\/?(?:wfm|warframe-market)\b/i.test(trimmed)) return true;
  return SELLER_INTENT.test(trimmed);
}

export function extractMarketSellerQuery(text: string): string | null {
  const trimmed = text.trim().replace(/^["']|["']$/g, "");
  if (!looksLikeMarketSellerRequest(trimmed)) return null;
  const stripped = trimmed
    .replace(/^\/?(?:wfm|warframe-market)\s+/i, "")
    .replace(/\b(?:please|operator)\b/gi, " ")
    .replace(
      /\b(?:find|show|list|get|copy)\s+(?:me\s+)?(?:the\s+)?(?:in-?game\s+)?(?:sellers?|whispers?|listings?)\s+(?:for|on|of)\s+/i,
      "",
    )
    .replace(/\b(?:copy\s+)?whispers?\s+for\s+/i, "")
    .replace(/\b(?:in-?game\s+sellers?\s+for)\s+/i, "")
    .replace(/\b(?:sellers?|whispers?|listings?)\s+(?:for|on|of)\s+/i, "")
    .replace(/\b(?:from\s+)?(?:wfm|warframe\.market)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!stripped || stripped.length < 2) return null;
  if (/^(wfm|warframe\.market|sellers?|whispers?)$/i.test(stripped)) return null;
  return stripped;
}
