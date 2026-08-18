import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeMarketQuotesToolResult,
  extractMarketQuotesFromToolOutput,
  extractMarketSellerQuery,
  filterIngameMaxedSells,
  formatMarketWhisper,
  looksLikeMarketSellerRequest,
  stripMarketQuotesMarker,
  type MarketOrderLike,
} from "./market-quotes.ts";

function sell(partial: {
  platinum: number;
  status?: string;
  ign?: string;
  rank?: number;
  quantity?: number;
  visible?: boolean;
  type?: string;
}): MarketOrderLike {
  return {
    type: partial.type ?? "sell",
    platinum: partial.platinum,
    quantity: partial.quantity,
    rank: partial.rank,
    visible: partial.visible,
    user: {
      ingameName: partial.ign ?? "Seller",
      status: partial.status ?? "ingame",
    },
  };
}

describe("market quotes helpers", () => {
  it("filters to cheapest in-game max-rank sells", () => {
    const picked = filterIngameMaxedSells(
      [
        sell({ platinum: 1, status: "online", rank: 10 }),
        sell({ platinum: 4, rank: 0 }),
        sell({ platinum: 30, rank: 10, ign: "A", quantity: 1 }),
        sell({ platinum: 20, rank: 10, ign: "B", quantity: 8 }),
        sell({ platinum: 20, rank: 10, ign: "C", quantity: 2 }),
        sell({ platinum: 25, rank: 10, ign: "D" }),
        sell({ platinum: 40, rank: 10, ign: "E" }),
        sell({ platinum: 35, rank: 10, ign: "F" }),
        sell({ platinum: 50, rank: 10, ign: "G" }),
      ],
      10,
    );
    assert.deepEqual(
      picked.map((row) => row.user?.ingameName),
      ["B", "C", "D", "A", "F"],
    );
  });

  it("ignores rank on unranked items", () => {
    const picked = filterIngameMaxedSells([
      sell({ platinum: 80, ign: "Set" }),
      sell({ platinum: 5, ign: "Ranked", rank: 0 }),
    ]);
    assert.deepEqual(
      picked.map((row) => row.user?.ingameName),
      ["Set"],
    );
  });

  it("formats /w whispers with IGN and rank token", () => {
    const whisper = formatMarketWhisper({
      ign: "OrdisFan",
      itemName: "Primed Continuity",
      platinum: 80,
      rank: 10,
    });
    assert.match(whisper, /^\/w OrdisFan /);
    assert.match(whisper, /"Primed Continuity \(rank 10\)"/);
    assert.match(whisper, /80 platinum/);
  });

  it("detects seller-intent NL and strips the item query", () => {
    assert.equal(looksLikeMarketSellerRequest("Should I farm or buy Soma Prime?"), false);
    assert.equal(
      extractMarketSellerQuery("find in-game sellers for Primed Continuity"),
      "Primed Continuity",
    );
    assert.equal(extractMarketSellerQuery("wfm soma prime"), "soma prime");
    assert.equal(
      extractMarketSellerQuery("copy whispers for galvanized aptitude"),
      "galvanized aptitude",
    );
  });

  it("round-trips encoded quotes payloads", () => {
    const quotes = {
      slug: "primed_continuity",
      itemName: "Primed Continuity",
      maxRank: 10,
      source: "full" as const,
      fetchedAt: "2026-08-18T00:00:00.000Z",
      url: "https://warframe.market/items/primed_continuity",
      quotes: [
        {
          ign: "SellerA",
          platinum: 80,
          quantity: 1,
          rank: 10,
          whisper: formatMarketWhisper({
            ign: "SellerA",
            itemName: "Primed Continuity",
            platinum: 80,
            rank: 10,
          }),
        },
      ],
    };
    const encoded = encodeMarketQuotesToolResult({
      content: "Opened panel",
      quotes,
    });
    const extracted = extractMarketQuotesFromToolOutput(encoded);
    assert.equal(extracted?.slug, "primed_continuity");
    assert.equal(extracted?.quotes[0]?.ign, "SellerA");
    assert.doesNotMatch(stripMarketQuotesMarker(encoded), /---MARKET_QUOTES---/);
  });
});
