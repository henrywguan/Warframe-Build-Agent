import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  combineElements,
  estimateWeaponDps,
  expectedCritMultiplier,
} from "./formulas.js";
import type { ResolvedModSet, WeaponDpsInput } from "./types.js";

describe("dps formulas", () => {
  it("computes expected crit multiplier for yellow and orange tiers", () => {
    assert.equal(expectedCritMultiplier(0.5, 2), 1.5);
    assert.ok(expectedCritMultiplier(1.5, 2) > 2);
  });

  it("combines cold+toxin into viral", () => {
    const combined = combineElements({ cold: 0.6, toxin: 0.6, heat: 0.9 });
    assert.ok((combined.viral ?? 0) > 0);
    assert.ok((combined.heat ?? 0) > 0);
  });

  it("estimates higher modded DPS than unmodded for a rifle shell", () => {
    const weapon: WeaponDpsInput = {
      id: "coda-hema",
      name: "Coda Hema",
      weaponClass: "rifle",
      totalDamage: 52,
      criticalChance: 0.2,
      criticalMultiplier: 2.3,
      procChance: 0.3,
      fireRate: 6.15,
      magazineSize: 72,
      reloadTime: 2,
    };
    const mods: ResolvedModSet = {
      requested: ["Serration", "Split Chamber", "Point Strike", "Vital Sense"],
      applied: [
        { name: "Serration", effects: { baseDamage: 1.65 } },
        { name: "Split Chamber", effects: { multishot: 0.9 } },
        { name: "Point Strike", effects: { critChance: 1.5 } },
        { name: "Vital Sense", effects: { critDamage: 1.2 } },
      ],
      unknown: [],
      totals: {
        baseDamage: 1.65,
        multishot: 0.9,
        critChance: 1.5,
        critDamage: 1.2,
        fireRate: 0,
        reload: 0,
        statusChance: 0,
        faction: 0,
        elemental: {},
      },
    };
    const estimate = estimateWeaponDps(weapon, mods);
    assert.ok(estimate.modded.burstDps > estimate.unmodded.burstDps * 3);
    assert.ok(estimate.modded.sustainedDps > estimate.unmodded.sustainedDps);
  });
});
