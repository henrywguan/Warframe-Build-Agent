import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  computePriceChanges,
  isDailyPullWindow,
  pacificDateString,
  runDailyPricePull,
  summarizeTopOrders,
} from "./snapshot.js";
import type { DailyMarketSnapshot } from "./types.js";
import { WarframeMarketClient } from "./client.js";

describe("summarizeTopOrders", () => {
  it("computes lowest sell, highest buy, and medians", () => {
    const summary = summarizeTopOrders("mirage_prime_set", {
      sell: [
        { id: "1", type: "sell", platinum: 84 },
        { id: "2", type: "sell", platinum: 80 },
        { id: "3", type: "sell", platinum: 90 },
      ],
      buy: [
        { id: "4", type: "buy", platinum: 70 },
        { id: "5", type: "buy", platinum: 75 },
      ],
    });

    assert.equal(summary.lowestSell, 80);
    assert.equal(summary.highestBuy, 75);
    assert.equal(summary.medianSell, 84);
    assert.equal(summary.medianBuy, 72.5);
  });

  it("prefers the highest sell rank present in top orders", () => {
    const summary = summarizeTopOrders("arcane_energize", {
      sell: [
        { id: "1", type: "sell", platinum: 7, rank: 0 },
        { id: "2", type: "sell", platinum: 120, rank: 5 },
        { id: "3", type: "sell", platinum: 125, rank: 5 },
      ],
      buy: [
        { id: "4", type: "buy", platinum: 90, rank: 5 },
        { id: "5", type: "buy", platinum: 5, rank: 0 },
      ],
    });

    assert.equal(summary.rank, 5);
    assert.equal(summary.lowestSell, 120);
    assert.equal(summary.highestBuy, 90);
  });

  it("does not let buy-only higher ranks override sell ranks", () => {
    const summary = summarizeTopOrders("arcane_energize", {
      sell: [
        { id: "1", type: "sell", platinum: 7, rank: 0 },
        { id: "2", type: "sell", platinum: 8, rank: 0 },
      ],
      buy: [
        { id: "3", type: "buy", platinum: 90, rank: 5 },
        { id: "4", type: "buy", platinum: 5, rank: 0 },
      ],
    });

    assert.equal(summary.rank, 0);
    assert.equal(summary.lowestSell, 7);
    assert.equal(summary.highestBuy, 5);
    assert.equal(summary.buyCount, 1);
  });
});




describe("computePriceChanges", () => {
  it("calculates day-over-day deltas", () => {
    const previous: DailyMarketSnapshot = {
      date: "2026-08-01",
      timezone: "America/Los_Angeles",
      pulledAt: "2026-08-01T23:00:00.000Z",
      platform: "pc",
      source: "https://api.warframe.market/v2",
      items: [
        {
          slug: "mirage_prime_set",
          name: "Mirage Prime Set",
          lowestSell: 100,
          highestBuy: 80,
          sellCount: 3,
          buyCount: 2,
          fetchedAt: "2026-08-01T23:00:00.000Z",
        },
      ],
    };
    const current: DailyMarketSnapshot = {
      ...previous,
      date: "2026-08-02",
      pulledAt: "2026-08-02T23:00:00.000Z",
      items: [
        {
          slug: "mirage_prime_set",
          name: "Mirage Prime Set",
          lowestSell: 90,
          highestBuy: 84,
          sellCount: 3,
          buyCount: 2,
          fetchedAt: "2026-08-02T23:00:00.000Z",
        },
      ],
    };

    const changes = computePriceChanges(previous, current);
    assert.equal(changes.changes.length, 1);
    assert.equal(changes.changes[0]?.lowestSellDelta, -10);
    assert.equal(changes.changes[0]?.lowestSellDeltaPct, -10);
    assert.equal(changes.changes[0]?.highestBuyDelta, 4);
    assert.equal(changes.changes[0]?.highestBuyDeltaPct, 5);
  });
});

describe("isDailyPullWindow", () => {
  it("detects 4pm Pacific", () => {
    // 2026-08-02 16:05 PDT = 23:05 UTC
    const inWindow = new Date("2026-08-02T23:05:00.000Z");
    const outside = new Date("2026-08-02T20:05:00.000Z");
    assert.equal(isDailyPullWindow(inWindow), true);
    assert.equal(isDailyPullWindow(outside), false);
    assert.equal(pacificDateString(inWindow), "2026-08-02");
  });
});

describe("runDailyPricePull", () => {
  it("writes snapshot and changes using mocked market responses", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "wfm-"));
    const watchlistPath = path.join(tmp, "watchlist.json");
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(
        watchlistPath,
        JSON.stringify({ items: ["mirage_prime_set"] }, null, 2),
      ),
    );

    const responses = new Map<string, unknown>([
      [
        "/items",
        [
          {
            slug: "mirage_prime_set",
            i18n: { en: { name: "Mirage Prime Set" } },
          },
        ],
      ],
      [
        "/orders/item/mirage_prime_set/top",
        {
          sell: [{ id: "s1", type: "sell", platinum: 90 }],
          buy: [{ id: "b1", type: "buy", platinum: 70 }],
        },
      ],
    ]);

    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input));
      const key = url.pathname.replace(/^\/v2/, "");
      const data = responses.get(key);
      if (!data) {
        return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
      }
      return new Response(JSON.stringify({ apiVersion: "0.25.0", data, error: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new WarframeMarketClient({
      fetchImpl,
      requestGapMs: 0,
      baseUrl: "https://api.warframe.market/v2",
    });

    const first = await runDailyPricePull({
      watchlistPath,
      dataDir: path.join(tmp, "data"),
      client,
      now: new Date("2026-08-01T23:00:00.000Z"),
      requirePullWindow: false,
    });
    assert.ok(first.snapshot);
    assert.equal(first.changes, null);

    // Second day with a different sell price.
    responses.set("/orders/item/mirage_prime_set/top", {
      sell: [{ id: "s2", type: "sell", platinum: 81 }],
      buy: [{ id: "b2", type: "buy", platinum: 72 }],
    });

    const second = await runDailyPricePull({
      watchlistPath,
      dataDir: path.join(tmp, "data"),
      client,
      now: new Date("2026-08-02T23:00:00.000Z"),
      requirePullWindow: false,
    });

    assert.ok(second.changes);
    assert.equal(second.changes.changes[0]?.lowestSellDelta, -9);
    const latest = JSON.parse(
      await readFile(path.join(tmp, "data/latest-changes.json"), "utf8"),
    );
    assert.equal(latest.changes[0].currentLowestSell, 81);

    await rm(tmp, { recursive: true, force: true });
  });
});
