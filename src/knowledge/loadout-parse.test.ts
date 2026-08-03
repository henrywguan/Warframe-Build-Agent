import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLoadoutFromText, tokenizeOcrText } from "./loadout-parse.js";
import type { CatalogItem, ModDigest } from "./types.js";

const catalog: CatalogItem[] = [
  {
    id: "coda-hema",
    name: "Coda Hema",
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

const mods: ModDigest[] = [
  { name: "Serration", kind: "mod", extract: "", pageUrl: "" },
  { name: "Vital Sense", kind: "mod", extract: "", pageUrl: "" },
  { name: "Point Strike", kind: "mod", extract: "", pageUrl: "" },
  { name: "Primary Merciless", kind: "arcane", extract: "", pageUrl: "" },
  { name: "Arcane Acceleration", kind: "arcane", extract: "", pageUrl: "" },
];

describe("loadout OCR text parse", () => {
  it("tokenizes noisy OCR lines", () => {
    const lines = tokenizeOcrText("Coda Hema\nSerration  |  Vital Sense\nPrimary Merciless");
    assert.ok(lines.includes("Coda Hema"));
    assert.ok(lines.some((l) => /Serration/i.test(l)));
  });

  it("extracts item, mods, and arcanes from screenshot-like text", () => {
    const parsed = parseLoadoutFromText(
      [
        "CODA HEMA",
        "Serration",
        "Vital Sense",
        "Point Strike",
        "Primary Merciless",
        "Arcane Acceleration",
      ].join("\n"),
      { catalog, mods },
    );
    assert.equal(parsed.itemName, "Coda Hema");
    assert.ok(parsed.mods.includes("Serration"));
    assert.ok(parsed.mods.includes("Vital Sense"));
    assert.ok(parsed.arcanes.includes("Primary Merciless"));
    assert.ok(parsed.confidence === "medium" || parsed.confidence === "high");
  });
});
