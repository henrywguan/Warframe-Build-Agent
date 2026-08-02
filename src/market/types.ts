export const MARKET_API_BASE = "https://api.warframe.market/v2";
export const MARKET_DEFAULT_LANGUAGE = "en";
export const MARKET_DEFAULT_PLATFORM = "pc";
/** Daily pull target: 4:00 PM America/Los_Angeles (PST/PDT). */
export const MARKET_DAILY_PULL_TIMEZONE = "America/Los_Angeles";
export const MARKET_DAILY_PULL_HOUR = 16;

export type MarketPlatform = "pc" | "ps4" | "xbox" | "switch";

export interface MarketClientOptions {
  baseUrl?: string;
  language?: string;
  platform?: MarketPlatform;
  fetchImpl?: typeof fetch;
  /** Delay between sequential item requests (ms). */
  requestGapMs?: number;
}

export interface MarketApiEnvelope<T> {
  apiVersion?: string;
  data: T;
  error: string | null;
}

export interface MarketItemI18n {
  name?: string;
  description?: string;
  wikiLink?: string;
  icon?: string;
  thumb?: string;
}

export interface MarketItem {
  id: string;
  slug: string;
  tags?: string[];
  ducats?: number;
  tradingTax?: number;
  tradable?: boolean;
  i18n?: Record<string, MarketItemI18n>;
}

export interface MarketOrderUser {
  id?: string;
  ingameName?: string;
  reputation?: number;
  platform?: string;
  status?: string;
  crossplay?: boolean;
}

export interface MarketOrder {
  id: string;
  type: "sell" | "buy" | string;
  platinum: number;
  quantity?: number;
  rank?: number;
  visible?: boolean;
  user?: MarketOrderUser;
}

export interface MarketTopOrders {
  sell: MarketOrder[];
  buy: MarketOrder[];
}

export interface ItemPriceSnapshot {
  slug: string;
  name?: string;
  /** Rank used for this snapshot when listings include rank (max rank preferred). */
  rank?: number;
  lowestSell?: number;
  highestBuy?: number;
  medianSell?: number;
  medianBuy?: number;
  sellCount: number;
  buyCount: number;
  fetchedAt: string;
}

export interface DailyMarketSnapshot {
  date: string;
  timezone: string;
  pulledAt: string;
  platform: MarketPlatform;
  source: string;
  items: ItemPriceSnapshot[];
}

export interface ItemPriceChange {
  slug: string;
  name?: string;
  previousDate: string;
  currentDate: string;
  previousLowestSell?: number;
  currentLowestSell?: number;
  lowestSellDelta?: number;
  lowestSellDeltaPct?: number;
  previousHighestBuy?: number;
  currentHighestBuy?: number;
  highestBuyDelta?: number;
  highestBuyDeltaPct?: number;
}

export interface DailyPriceChanges {
  date: string;
  previousDate: string;
  timezone: string;
  generatedAt: string;
  platform: MarketPlatform;
  source: string;
  changes: ItemPriceChange[];
}

export interface MarketWatchlist {
  description?: string;
  platform?: MarketPlatform;
  items: string[];
}
