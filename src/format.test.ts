import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatArbitration,
  formatDailyDeals,
  formatFissures,
  formatSummary,
  humanizeExpiry,
} from "./format.js";
import type { DailyDeal, Fissure } from "./types.js";

describe("humanizeExpiry", () => {
  it("formats minutes and hours from a fixed now", () => {
    const now = Date.parse("2026-08-02T22:00:00.000Z");
    assert.equal(
      humanizeExpiry("2026-08-02T22:25:00.000Z", now),
      "~25m left",
    );
    assert.equal(
      humanizeExpiry("2026-08-03T01:10:00.000Z", now),
      "~3h 10m left",
    );
    assert.equal(humanizeExpiry("2026-08-02T21:00:00.000Z", now), "expired");
  });
});

describe("formatFissures", () => {
  const sample: Fissure[] = [
    {
      tier: "Neo",
      missionType: "Capture",
      node: "Abaddon (Europa)",
      enemy: "Corpus",
      isHard: false,
      expiry: "2099-01-01T00:00:00.000Z",
    },
    {
      tier: "Requiem",
      missionType: "Disruption",
      node: "Tamu (Kuva Fortress)",
      enemy: "Grineer",
      isHard: true,
      expiry: "2099-01-01T00:00:00.000Z",
    },
  ];

  it("filters Steel Path and tier", () => {
    const text = formatFissures(sample, {
      steelPathOnly: true,
      tier: "Requiem",
    });
    assert.match(text, /Requiem Disruption/);
    assert.match(text, /Steel Path/);
    assert.doesNotMatch(text, /Abaddon/);
  });
});

describe("formatSummary", () => {
  it("includes platform caveat line", () => {
    const text = formatSummary({
      platform: "pc",
      alerts: [],
      fissures: [],
      invasions: [],
      sortie: { boss: "Test", faction: "Grineer", variants: [] },
      archonHunt: { boss: "Archon", faction: "Grineer", missions: [] },
      voidTrader: { character: "Baro Ki'Teer", location: "Larunda Relay" },
      steelPath: { currentReward: { name: "Forma", cost: 25 }, remaining: "2d" },
      cycles: {
        cetusCycle: { state: "day", timeLeft: "20m" },
        vallisCycle: { state: "cold", timeLeft: "10m" },
        cambionCycle: { state: "fass", timeLeft: "30m" },
        earthCycle: { state: "night", timeLeft: "1h" },
        zarimanCycle: { state: "corpus", timeLeft: "2h" },
        duviriCycle: { state: "joy", timeLeft: "3h" },
      },
      events: [],
    });

    assert.match(text, /platform: pc/);
    assert.match(text, /api\.warframestat\.us/);
    assert.match(text, /Cetus \/ Plains: day/);
  });
});

describe("formatArbitration", () => {
  it("formats node, type, and timer", () => {
    const text = formatArbitration({
      node: "Hydron (Sedna)",
      type: "Survival",
      enemy: "Grineer",
      expiry: "2099-01-01T00:00:00.000Z",
      archwing: false,
    });
    assert.match(text, /Arbitration — Survival @ Hydron/);
    assert.match(text, /Grineer/);
    assert.match(text, /left/);
  });

  it("returns empty message when no data", () => {
    assert.match(formatArbitration({}), /No active Arbitration/);
  });

  it("treats SolNode000 placeholder as inactive", () => {
    assert.match(
      formatArbitration({
        node: "SolNode000",
        nodeKey: "SolNode000",
        type: "Unknown",
        enemy: "Tenno",
        expired: true,
      }),
      /No active Arbitration/,
    );
  });
});

describe("formatDailyDeals", () => {
  it("formats deal price and stock", () => {
    const deals: DailyDeal[] = [
      {
        item: "Orokin Catalyst",
        originalPrice: 20,
        salePrice: 10,
        discount: 0.5,
        sold: 3,
        total: 10,
        expiry: "2099-01-01T00:00:00.000Z",
      },
    ];
    const text = formatDailyDeals(deals);
    assert.match(text, /Darvo daily deals/);
    assert.match(text, /Orokin Catalyst/);
    assert.match(text, /10p/);
    assert.match(text, /3\/10 sold/);
  });

  it("returns empty message when no deals", () => {
    assert.equal(formatDailyDeals([]), "No Darvo daily deals listed.");
  });
});
