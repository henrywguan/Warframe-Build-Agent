import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const route = readFileSync(join(here, "route.ts"), "utf8");

describe("POST /api/market/wfm", () => {
  it("looks up in-game quotes from a JSON item query", () => {
    assert.match(route, /liveMarketIngameQuotes/);
    assert.match(route, /isAuthorized/);
    assert.match(route, /Enter an item name/);
    assert.match(route, /body\.query/);
    assert.match(route, /matches/);
  });
});
