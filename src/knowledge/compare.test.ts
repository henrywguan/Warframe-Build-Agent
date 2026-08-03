import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  compareLoadoutToTopBuilds,
  diffAgainstBuild,
  formatCompareResult,
} from "./compare.js";
import type { OverframeBuild } from "./types.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("loadout compare", () => {
  it("scores shared / missing / extra mods against a build", () => {
    const build: OverframeBuild = {
      rank: 1,
      name: "Sample",
      summary: "sample",
      mods: ["Serration", "Vital Sense", "Point Strike"],
      arcanes: ["Primary Merciless"],
    };
    const diff = diffAgainstBuild(
      {
        itemName: "Coda Hema",
        mods: ["Serration", "Vital Sense", "Hellfire"],
        arcanes: ["Primary Merciless"],
      },
      build,
    );
    assert.deepEqual(diff.sharedMods.sort(), ["Serration", "Vital Sense"].sort());
    assert.ok(diff.missingMods.includes("Point Strike"));
    assert.ok(diff.extraMods.includes("Hellfire"));
    assert.ok(diff.score > 40);
  });

  it("compares a loadout to local Coda Hema top builds", async () => {
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
      { repoRoot, topN: 3 },
    );
    assert.equal(result.ok, true);
    assert.ok(result.buildsCompared >= 2);
    assert.equal(result.bestRank, 1);
    assert.ok((result.diffs[0]?.score ?? 0) >= 90);
    const text = formatCompareResult(result);
    assert.match(text, /LOCAL_BUILDS_AVAILABLE/);
    assert.match(text, /Coda Hema/i);
  });
});
