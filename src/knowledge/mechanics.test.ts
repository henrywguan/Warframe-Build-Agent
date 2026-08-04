import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wikitextToPlain } from "./mechanics.js";
import { findMechanicsMatches, scoreMechanicsDigest } from "./query.js";
import type { MechanicsDigest } from "./types.js";

describe("wikitextToPlain", () => {
  it("strips templates and keeps link labels", () => {
    const plain = wikitextToPlain(
      "== Viral ==\n{{Infobox|x=1}}\n[[Damage/Viral Damage|Viral]] reduces [[Health]] by up to 325%.\n",
    );
    assert.match(plain, /Viral/);
    assert.match(plain, /Health/);
    assert.doesNotMatch(plain, /\{\{/);
  });
});

describe("mechanics lookup scoring", () => {
  const digests: MechanicsDigest[] = [
    {
      id: "damage-viral",
      title: "Damage/Viral Damage",
      kind: "damage",
      aliases: ["viral", "viral proc", "cold toxin"],
      summary: "Viral damage and health-amp status effect.",
      pageUrl: "https://wiki.warframe.com/w/Damage/Viral_Damage",
      extract: "Viral status amplifies damage to health.",
      fetchedAt: new Date().toISOString(),
      source: "wiki",
    },
    {
      id: "damage-corrosive",
      title: "Damage/Corrosive Damage",
      kind: "damage",
      aliases: ["corrosive", "armor strip", "electricity toxin"],
      summary: "Corrosive damage and armor-strip status effect.",
      pageUrl: "https://wiki.warframe.com/w/Damage/Corrosive_Damage",
      extract: "Corrosive reduces armor.",
      fetchedAt: new Date().toISOString(),
      source: "wiki",
    },
    {
      id: "damage-magnetic",
      title: "Damage/Magnetic Damage",
      kind: "damage",
      aliases: ["magnetic", "shield strip"],
      summary: "Magnetic damage and shield-disruption status effect.",
      pageUrl: "https://wiki.warframe.com/w/Damage/Magnetic_Damage",
      extract: "Magnetic disrupts shields.",
      fetchedAt: new Date().toISOString(),
      source: "wiki",
    },
    {
      id: "damage-radiation",
      title: "Damage/Radiation Damage",
      kind: "damage",
      aliases: ["radiation", "rad"],
      summary: "Radiation damage and confusion status.",
      pageUrl: "https://wiki.warframe.com/w/Damage/Radiation_Damage",
      extract: "Radiation causes confusion.",
      fetchedAt: new Date().toISOString(),
      source: "wiki",
    },
  ];

  it("scores viral alias highly", () => {
    assert.ok(scoreMechanicsDigest("viral status", digests[0]!) >= 60);
  });

  it("returns multiple digests for rad viral vs corrosive magnetic", () => {
    const hits = findMechanicsMatches(
      digests,
      "is it better to stack rad viral or corrosive magnetic",
      6,
    );
    const ids = hits.map((h) => h.id);
    assert.ok(ids.includes("damage-viral"));
    assert.ok(ids.includes("damage-corrosive"));
    assert.ok(ids.includes("damage-magnetic") || ids.includes("damage-radiation"));
  });
});

describe("live pack lookup ranking", () => {
  it("surfaces mechanics before arcane noise for viral / status effect", async () => {
    const { lookupLocalKnowledge } = await import("./query.js");
    const viral = await lookupLocalKnowledge("viral");
    assert.match(viral, /# Mechanics \/ resource digests/);
    const viralMech = viral.indexOf("# Mechanics / resource digests");
    const viralArcane = viral.indexOf("# Arcane digests");
    if (viralArcane !== -1) {
      assert.ok(viralMech < viralArcane, "mechanics section should precede arcanes for viral");
    }
    assert.match(viral, /Viral/i);
    assert.doesNotMatch(viral.slice(0, 400), /Arcane Truculence/);

    const status = await lookupLocalKnowledge("status effect");
    assert.match(status, /# Mechanics \/ resource digests/);
    assert.match(status, /## Status Effect/);
    const statusMech = status.indexOf("# Mechanics / resource digests");
    const statusArcane = status.indexOf("# Arcane digests");
    if (statusArcane !== -1) {
      assert.ok(statusMech < statusArcane);
    }
  });

  it("still finds named arcanes by title", async () => {
    const { lookupLocalKnowledge } = await import("./query.js");
    const text = await lookupLocalKnowledge("Arcane Energize");
    assert.match(text, /# Arcane digests/);
    assert.match(text, /Arcane Energize/);
  });
});
