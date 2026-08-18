import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { liveMarketIngameQuotes } from "./warframe-live.ts";

function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("liveMarketIngameQuotes", () => {
  it("returns structured quotes from a mocked full sell book (no network)", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/v2/items")) {
        return jsonOk([
          {
            slug: "primed_continuity",
            maxRank: 10,
            i18n: { en: { name: "Primed Continuity" } },
          },
        ]);
      }
      if (url.includes("/v2/items/primed_continuity")) {
        return jsonOk({
          slug: "primed_continuity",
          maxRank: 10,
          i18n: { en: { name: "Primed Continuity" } },
        });
      }
      if (url.includes("/v2/orders/item/primed_continuity") && !url.includes("/top")) {
        return jsonOk([
          {
            id: "1",
            type: "sell",
            platinum: 90,
            quantity: 1,
            rank: 10,
            user: { ingameName: "Dearer", status: "ingame", reputation: 3 },
          },
          {
            id: "2",
            type: "sell",
            platinum: 80,
            quantity: 2,
            rank: 10,
            user: { ingameName: "CheapIngame", status: "ingame", reputation: 20 },
          },
          {
            id: "3",
            type: "sell",
            platinum: 10,
            rank: 0,
            user: { ingameName: "Unranked", status: "ingame" },
          },
          {
            id: "4",
            type: "sell",
            platinum: 5,
            rank: 10,
            user: { ingameName: "OnlineOnly", status: "online" },
          },
        ]);
      }
      return jsonOk(null, 404);
    };

    const result = await liveMarketIngameQuotes("Primed Continuity", { fetchImpl });
    assert.ok(result.quotes);
    assert.equal(result.quotes?.slug, "primed_continuity");
    assert.equal(result.quotes?.maxRank, 10);
    assert.equal(result.quotes?.quotes[0]?.ign, "CheapIngame");
    assert.equal(result.quotes?.quotes[0]?.platinum, 80);
    assert.match(result.quotes?.quotes[0]?.whisper ?? "", /^\/w CheapIngame /);
    assert.match(result.content, /Opened Market Quotes panel/);
    assert.doesNotMatch(result.content, /\/w CheapIngame Hi!/);
  });

  it("falls back to /top when the full book 404s", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/v2/items")) {
        return jsonOk([
          {
            slug: "soma_prime_set",
            i18n: { en: { name: "Soma Prime Set" } },
          },
        ]);
      }
      if (url.includes("/v2/items/soma_prime_set")) {
        return jsonOk({
          slug: "soma_prime_set",
          i18n: { en: { name: "Soma Prime Set" } },
        });
      }
      if (url.includes("/v2/orders/item/soma_prime_set/top")) {
        return jsonOk({
          sell: [
            {
              id: "s1",
              type: "sell",
              platinum: 45,
              quantity: 1,
              user: { ingameName: "SetSeller", status: "ingame" },
            },
          ],
          buy: [],
        });
      }
      if (url.includes("/v2/orders/item/soma_prime_set")) {
        return new Response("missing", { status: 404 });
      }
      return jsonOk(null, 404);
    };

    const result = await liveMarketIngameQuotes("soma_prime_set", { fetchImpl });
    assert.equal(result.quotes?.source, "top");
    assert.equal(result.quotes?.quotes.length, 1);
    assert.match(result.content, /top-order book/);
  });
});
