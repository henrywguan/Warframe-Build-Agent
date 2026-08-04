import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyArcaneSlot } from "./arcanes.js";
import { findArcaneMatches, scoreArcaneDigest } from "./query.js";
import type { ArcaneDigest } from "./types.js";

describe("arcane digests", () => {
  it("classifies common arcane slot families", () => {
    assert.equal(classifyArcaneSlot("Arcane Energize"), "warframe");
    assert.equal(classifyArcaneSlot("Primary Merciless"), "primary");
    assert.equal(classifyArcaneSlot("Secondary Fortifier"), "secondary");
    assert.equal(classifyArcaneSlot("Melee Duplicate"), "melee");
    assert.equal(classifyArcaneSlot("Magus Elevate"), "operator");
    assert.equal(classifyArcaneSlot("Virtuos Strike"), "amp");
    assert.equal(classifyArcaneSlot("Pax Charge"), "kitgun");
    assert.equal(classifyArcaneSlot("Exodia Contagion"), "zaw");
  });

  it("scores arcane name lookups", () => {
    const digest: ArcaneDigest = {
      id: "arcane-energize",
      title: "Arcane Energize",
      slot: "warframe",
      aliases: ["Arcane Energize", "Energize"],
      summary: "Chance to restore energy to nearby allies on energy pickup.",
      pageUrl: "https://wiki.warframe.com/w/Arcane_Energize",
      extract: "On Energy Pickup: 60% chance to restore 150 Energy to nearby allies.",
      fetchedAt: new Date().toISOString(),
      source: "wiki",
    };
    assert.ok(scoreArcaneDigest("energize", digest) >= 60);
    const hits = findArcaneMatches([digest], "arcane energize", 3);
    assert.equal(hits[0]?.title, "Arcane Energize");
  });
});
