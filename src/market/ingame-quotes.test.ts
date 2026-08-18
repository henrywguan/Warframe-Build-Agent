import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MarketOrder } from "./types.js";
import {
  filterIngameMaxedSells,
  formatMarketWhisper,
  formatNoIngameSellers,
  itemLooksLikeRiven,
  itemMaxRank,
  normalizeMarketOrders,
  pickMarketSlug,
  toMarketQuoteRows,
} from "./ingame-quotes.js";

function sell(partial: {
  id: string;
  platinum: number;
  status?: string;
  ign?: string;
  rank?: number;
  quantity?: number;
  visible?: boolean;
  type?: string;
}): MarketOrder {
  return {
    id: partial.id,
    type: partial.type ?? "sell",
    platinum: partial.platinum,
    quantity: partial.quantity,
    rank: partial.rank,
    visible: partial.visible,
    user: {
      ingameName: partial.ign ?? `User${partial.id}`,
      status: partial.status ?? "ingame",
      reputation: 12,
    },
  };
}

describe("ingame market quotes", () => {
  it("keeps the 5 cheapest in-game max-rank sells", () => {
    const orders: MarketOrder[] = [
      sell({ id: "online", platinum: 1, status: "online", rank: 10 }),
      sell({ id: "offline", platinum: 2, status: "offline", rank: 10 }),
      sell({ id: "invis", platinum: 3, status: "invisible", rank: 10 }),
      sell({ id: "r0", platinum: 4, status: "ingame", rank: 0 }),
      sell({ id: "buy", platinum: 5, status: "ingame", rank: 10, type: "buy" }),
      sell({ id: "hidden", platinum: 6, status: "ingame", rank: 10, visible: false }),
      sell({ id: "a", platinum: 40, rank: 10, quantity: 1 }),
      sell({ id: "b", platinum: 20, rank: 10, quantity: 2 }),
      sell({ id: "c", platinum: 20, rank: 10, quantity: 9 }),
      sell({ id: "d", platinum: 30, rank: 10 }),
      sell({ id: "e", platinum: 50, rank: 10 }),
      sell({ id: "f", platinum: 25, rank: 10 }),
      sell({ id: "g", platinum: 35, rank: 10 }),
    ];
    const picked = filterIngameMaxedSells(orders, 10);
    assert.deepEqual(
      picked.map((o) => o.id),
      ["c", "b", "f", "d", "g"],
    );
  });

  it("ignores rank when the item has no maxRank", () => {
    const orders: MarketOrder[] = [
      sell({ id: "set", platinum: 80, ign: "SellerA" }),
      sell({ id: "ranked", platinum: 10, rank: 0, ign: "SkipMe" }),
      sell({ id: "set2", platinum: 90, ign: "SellerB", quantity: 3 }),
    ];
    const picked = filterIngameMaxedSells(orders, undefined);
    assert.deepEqual(
      picked.map((o) => o.id),
      ["set", "set2"],
    );
  });

  it("builds the official /w whisper with IGN, plat, and rank token", () => {
    const ranked = formatMarketWhisper({
      ign: "OrdisFan",
      itemName: "Primed Continuity",
      platinum: 80,
      rank: 10,
    });
    assert.match(ranked, /^\/w OrdisFan /);
    assert.match(ranked, /"Primed Continuity \(rank 10\)"/);
    assert.match(ranked, /for 80 platinum/);
    assert.match(ranked, /\(warframe\.market\)/);

    const unranked = formatMarketWhisper({
      ign: "TennoOne",
      itemName: "Soma Prime Set",
      platinum: 45,
    });
    assert.equal(
      unranked,
      `/w TennoOne Hi! I want to buy: "Soma Prime Set" for 45 platinum. (warframe.market)`,
    );
  });

  it("normalizes array and {sell,buy} order books", () => {
    const asArray = normalizeMarketOrders([sell({ id: "1", platinum: 1 })]);
    assert.equal(asArray.length, 1);
    const mixed = normalizeMarketOrders({
      sell: [sell({ id: "s", platinum: 2 })],
      buy: [sell({ id: "b", platinum: 3, type: "buy" })],
    });
    assert.equal(mixed.length, 2);
  });

  it("reads maxRank from item metadata", () => {
    assert.equal(itemMaxRank({ maxRank: 10 }), 10);
    assert.equal(itemMaxRank({ modMaxRank: 5 }), 5);
    assert.equal(itemMaxRank({ maxRank: 0 }), undefined);
    assert.equal(itemMaxRank({}), undefined);
  });

  it("flags riven slugs as out of scope", () => {
    assert.equal(itemLooksLikeRiven("soma_prime_riven"), true);
    assert.equal(itemLooksLikeRiven("soma_prime_set", ["set"]), false);
    assert.equal(itemLooksLikeRiven("weird", ["riven"]), true);
  });

  it("falls back to /top when the full order book 404s", async () => {
    const { WarframeMarketClient } = await import("./client.js");
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/orders/item/") && url.includes("/top")) {
        return new Response(
          JSON.stringify({
            data: {
              sell: [sell({ id: "top1", platinum: 12, rank: 10 })],
              buy: [],
            },
            error: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/orders/item/")) {
        return new Response("missing", { status: 404 });
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;
    const client = new WarframeMarketClient({ fetchImpl, requestGapMs: 0 });
    const result = await client.getItemOrders("primed_continuity");
    assert.equal(result.source, "top");
    assert.equal(result.orders[0]?.id, "top1");
  });

  it("auto-picks high-confidence slugs and lists ambiguous ones", () => {
    const items = [
      { slug: "soma_prime_set", name: "Soma Prime Set" },
      { slug: "soma_prime_blueprint", name: "Soma Prime Blueprint" },
      { slug: "primed_continuity", name: "Primed Continuity" },
    ];
    const exact = pickMarketSlug("Primed Continuity", items);
    assert.equal(exact.kind, "pick");
    if (exact.kind === "pick") {
      assert.equal(exact.match.slug, "primed_continuity");
    }

    const fuzzy = pickMarketSlug("soma prime", items);
    assert.equal(fuzzy.kind, "ambiguous");
    if (fuzzy.kind === "ambiguous") {
      assert.ok(fuzzy.matches.length >= 2);
    }

    const none = pickMarketSlug("not an item xyzzy", items);
    assert.equal(none.kind, "none");
  });

  it("attaches whisper text to quote rows", () => {
    const rows = toMarketQuoteRows(
      [
        sell({
          id: "1",
          platinum: 12,
          ign: "SellerZ",
          rank: 10,
          quantity: 4,
        }),
      ],
      "Galvanized Aptitude",
    );
    assert.equal(rows[0]?.ign, "SellerZ");
    assert.match(rows[0]?.whisper ?? "", /^\/w SellerZ /);
    assert.match(rows[0]?.whisper ?? "", /rank 10/);
  });

  it("suggests /market when the sell book is empty", () => {
    const text = formatNoIngameSellers("Primed Continuity", "primed_continuity", 10);
    assert.match(text, /No in-game max rank 10 sellers/);
    assert.match(text, /\/market primed_continuity/);
  });
});
