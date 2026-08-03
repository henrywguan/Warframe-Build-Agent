import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCatalogMatches } from "./query.js";
import type { CatalogItem } from "./types.js";

describe("findCatalogMatches", () => {
  const catalog: CatalogItem[] = [
    {
      id: "coda-hema",
      name: "Coda Hema",
      kind: "weapon",
      category: "Primary",
      stats: {},
    },
    {
      id: "hema",
      name: "Hema",
      kind: "weapon",
      category: "Primary",
      stats: {},
    },
    {
      id: "revenant-prime",
      name: "Revenant Prime",
      kind: "warframe",
      category: "Warframes",
      stats: {},
    },
  ];

  it("ranks exact and longer names sensibly", () => {
    const hits = findCatalogMatches(catalog, "Coda Hema", 3);
    assert.equal(hits[0]?.name, "Coda Hema");
  });

  it("matches partial tokens", () => {
    const hits = findCatalogMatches(catalog, "revenant", 3);
    assert.equal(hits[0]?.name, "Revenant Prime");
  });
});
