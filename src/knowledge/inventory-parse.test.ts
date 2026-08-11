import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatInventoryParse, parseInventory } from "./inventory-parse.js";

describe("inventory parse", () => {
  it("splits comma and newline lists", () => {
    const parsed = parseInventory("Rhino Prime\nSoma Prime, Primed Flow, Blind Rage");
    assert.ok(parsed.frames.includes("Rhino Prime"));
    assert.ok(parsed.weapons.includes("Soma Prime"));
    assert.ok(parsed.mods.some((m) => /Primed Flow/i.test(m)));
  });

  it("deduplicates entries", () => {
    const parsed = parseInventory("Rhino Prime\nRhino Prime");
    assert.equal(parsed.frames.length, 1);
  });

  it("formats summary lines", () => {
    const text = formatInventoryParse("Ignis Wraith, Vitality");
    assert.match(text, /Weapons/);
    assert.match(text, /Mods/);
  });
});
