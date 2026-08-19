import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyItemName,
  setArsenalCatalogForTests,
  slotFromCatalogRow,
} from "./arsenal-classify.ts";
import {
  composeSavedBuildFromNaturalLanguage,
  composeSavedBuildFromParsedLoadout,
  composeSavedBuildFromToolArgs,
  encodeSavedBuildToolResult,
  extractSavedBuildFromToolOutput,
  looksLikeSaveBuildRequest,
} from "./save-build-compose.ts";

describe("arsenal classify + NL save", () => {
  it("detects save-build natural language intent", () => {
    assert.equal(
      looksLikeSaveBuildRequest('I want to save a build for "Soma Prime"'),
      true,
    );
    assert.equal(looksLikeSaveBuildRequest("add my build"), true);
    assert.equal(looksLikeSaveBuildRequest("add this to my builds"), true);
    assert.equal(looksLikeSaveBuildRequest("compare my loadout"), false);
  });

  it("maps catalog categories to arsenal slots", () => {
    assert.equal(
      slotFromCatalogRow({
        id: "1",
        name: "Soma Prime",
        kind: "weapon",
        category: "Primary",
      }),
      "primary",
    );
    assert.equal(
      slotFromCatalogRow({
        id: "2",
        name: "Mag Prime",
        kind: "warframe",
        category: "Warframes",
      }),
      "warframe",
    );
  });

  it("classifies Soma Prime as primary from injected catalog", async () => {
    setArsenalCatalogForTests([
      {
        id: "somaprime",
        name: "Soma Prime",
        kind: "weapon",
        category: "Primary",
        type: "Rifle",
      },
      {
        id: "magprime",
        name: "Mag Prime",
        kind: "warframe",
        category: "Warframes",
      },
    ]);
    const hit = await classifyItemName("soma prime");
    assert.equal(hit.slot, "primary");
    assert.equal(hit.matchedName, "Soma Prime");
    setArsenalCatalogForTests(null);
  });

  it("composes a card from NL save text", async () => {
    setArsenalCatalogForTests([
      {
        id: "somaprime",
        name: "Soma Prime",
        kind: "weapon",
        category: "Primary",
      },
    ]);
    const build = await composeSavedBuildFromNaturalLanguage(
      [
        'save a build for Soma Prime',
        "mods: Serration, Vital Sense, Point Strike",
        "arcanes: Primary Merciless",
        "crystals: Crimson Primary Damage, Amber Casting Speed",
      ].join("\n"),
    );
    assert.ok(build);
    assert.equal(build!.primary.name, "Soma Prime");
    assert.ok(build!.primary.mods.includes("Serration"));
    assert.ok(build!.primary.arcanes.includes("Primary Merciless"));
    assert.equal(build!.archonCrystals.length, 2);
    setArsenalCatalogForTests(null);
  });

  it("composes from parsed loadout + tool encode round-trip", async () => {
    setArsenalCatalogForTests([
      {
        id: "somaprime",
        name: "Soma Prime",
        kind: "weapon",
        category: "Primary",
      },
    ]);
    const build = await composeSavedBuildFromParsedLoadout({
      itemName: "Soma Prime",
      mods: ["Serration"],
      arcanes: ["Primary Merciless"],
    });
    assert.equal(build.primary.name, "Soma Prime");
    const encoded = encodeSavedBuildToolResult(build, "Rifles");
    const extracted = extractSavedBuildFromToolOutput(encoded);
    assert.ok(extracted);
    assert.equal(extracted!.build.primary.name, "Soma Prime");
    assert.equal(extracted!.folderName, "Rifles");
    setArsenalCatalogForTests(null);
  });

  it("accepts explicit multi-slot tool args", async () => {
    const build = await composeSavedBuildFromToolArgs({
      name: "Full kit",
      warframe: "Rhino Prime",
      primary: "Soma Prime",
      companion: "Carrier",
      crystals: ["Crimson Melee Critical Chance"],
    });
    assert.equal(build.warframe.name, "Rhino Prime");
    assert.equal(build.primary.name, "Soma Prime");
    assert.equal(build.companion.name, "Carrier");
    assert.equal(build.archonCrystals[0]?.color, "Crimson");
  });
});
