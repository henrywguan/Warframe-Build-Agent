import {
  MARKET_API_BASE,
  MARKET_DEFAULT_LANGUAGE,
  MARKET_DEFAULT_PLATFORM,
  type MarketApiEnvelope,
  type MarketClientOptions,
  type MarketItem,
  type MarketPlatform,
  type MarketTopOrders,
} from "./types.js";

export class WarframeMarketError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "WarframeMarketError";
    this.status = status;
    this.path = path;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class WarframeMarketClient {
  readonly baseUrl: string;
  readonly language: string;
  readonly platform: MarketPlatform;
  readonly requestGapMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: MarketClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? MARKET_API_BASE).replace(/\/$/, "");
    this.language = options.language ?? MARKET_DEFAULT_LANGUAGE;
    this.platform = options.platform ?? MARKET_DEFAULT_PLATFORM;
    this.requestGapMs = options.requestGapMs ?? 350;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  listItems(): Promise<MarketItem[]> {
    return this.request<MarketItem[]>("/items");
  }

  getItem(slug: string): Promise<MarketItem> {
    return this.request<MarketItem>(`/items/${encodeURIComponent(slug)}`);
  }

  getTopOrders(slug: string): Promise<MarketTopOrders> {
    return this.request<MarketTopOrders>(
      `/orders/item/${encodeURIComponent(slug)}/top`,
    );
  }

  async getTopOrdersMany(
    slugs: string[],
  ): Promise<Array<{ slug: string; orders: MarketTopOrders }>> {
    const results: Array<{ slug: string; orders: MarketTopOrders }> = [];
    for (const [index, slug] of slugs.entries()) {
      if (index > 0 && this.requestGapMs > 0) {
        await sleep(this.requestGapMs);
      }
      const orders = await this.getTopOrders(slug);
      results.push({ slug, orders });
    }
    return results;
  }

  private async request<T>(path: string, attempt = 1): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Language: this.language,
        Platform: this.platform,
        "User-Agent": "warframe-build-agent/0.1.0",
      },
    });

    if (!response.ok) {
      const retryable =
        response.status === 429 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504;
      if (retryable && attempt < 4) {
        await sleep(500 * attempt);
        return this.request<T>(path, attempt + 1);
      }
      throw new WarframeMarketError(
        `Warframe.market request failed (${response.status}) for ${path}`,
        response.status,
        path,
      );
    }

    const body = (await response.json()) as MarketApiEnvelope<T>;
    if (body.error) {
      throw new WarframeMarketError(
        `Warframe.market API error for ${path}: ${body.error}`,
        response.status,
        path,
      );
    }
    return body.data;
  }
}
