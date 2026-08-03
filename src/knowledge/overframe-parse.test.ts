import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseBuildPageMods,
  parseTopBuildLinks,
  summarizeBuild,
} from "./overframe-parse.js";
import { indexModsFromBuilds } from "./overframe.js";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("overframe parsers", () => {
  it("extracts top 2 build links from an item page", () => {
    const html = readFileSync(path.join(here, "fixtures/overframe-item.html"), "utf8");
    const builds = parseTopBuildLinks("Excalibur", html);
    assert.equal(builds.length, 2);
    assert.equal(builds[0]?.url, "https://overframe.gg/build/111/excalibur-sp-umbra");
    assert.equal(builds[1]?.url, "https://overframe.gg/build/222/excalibur-budget");
    assert.match(builds[0]?.name || "", /SP Umbra/);
  });

  it("scans mods and arcanes from a build page __NEXT_DATA__", () => {
    const html = readFileSync(path.join(here, "fixtures/overframe-build.html"), "utf8");
    const parsed = parseBuildPageMods(html);
    assert.ok(parsed.mods.includes("Umbral Intensify"));
    assert.ok(parsed.mods.includes("Primed Continuity"));
    assert.ok(parsed.arcanes.includes("Arcane Energize"));
    assert.ok(parsed.arcanes.includes("Moeaze"));
    assert.equal(parsed.forma, 5);
    assert.equal(parsed.name, "SP Umbra Blade");
  });

  it("indexes unique mods/arcanes from crawled builds", () => {
    const indexed = indexModsFromBuilds([
      {
        id: "excalibur",
        itemName: "Excalibur",
        source: "overframe",
        fetchedAt: new Date().toISOString(),
        builds: [
          {
            rank: 1,
            name: "A",
            summary: summarizeBuild("A", ["Serration"], ["Arcane Energize"]),
            mods: ["Serration", "Vital Sense"],
            arcanes: ["Arcane Energize"],
          },
        ],
      },
    ]);
    assert.equal(indexed.length, 3);
    assert.ok(indexed.some((m) => m.name === "Arcane Energize" && m.kind === "arcane"));
    assert.ok(indexed.some((m) => m.name === "Serration" && m.kind === "mod"));
  });
});
