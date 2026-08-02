import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFissures,
  formatSummary,
  humanizeExpiry,
} from "./format.js";
import type { Fissure } from "./types.js";

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
