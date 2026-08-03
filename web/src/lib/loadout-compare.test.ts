import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareLoadoutToTopBuilds,
  formatLoadoutCompare,
} from "./loadout-compare.ts";
import { parseLoadoutFromText } from "./loadout-parse.ts";

describe("web loadout compare", () => {
  it("compares a near-match Coda Hema loadout to local top builds", async () => {
    const result = await compareLoadoutToTopBuilds(
      {
        itemName: "Coda Hema",
        mods: [
          "Serration",
          "High Voltage",
          "Rime Rounds",
          "Vital Sense",
          "Point Strike",
          "Carbide Deposit",
          "Galvanized Chamber",
          "Primed Fast Hands",
        ],
        arcanes: ["Primary Merciless", "Arcane Acceleration"],
      },
      3,
    );
    assert.equal(result.ok, true);
    assert.ok(result.buildsCompared >= 2);
    assert.equal(result.bestRank, 1);
    assert.match(formatLoadoutCompare(result), /LOCAL_BUILDS_AVAILABLE/);
  });

  it("parses OCR-like text into a loadout", () => {
    const parsed = parseLoadoutFromText(
      "Coda Hema\nSerration\nVital Sense\nPrimary Merciless",
      [{ id: "coda-hema", name: "Coda Hema" }],
      [
        { name: "Serration", kind: "mod" },
        { name: "Vital Sense", kind: "mod" },
        { name: "Primary Merciless", kind: "arcane" },
      ],
    );
    assert.equal(parsed.itemName, "Coda Hema");
    assert.ok(parsed.mods.includes("Serration"));
    assert.ok(parsed.arcanes.includes("Primary Merciless"));
  });
});
