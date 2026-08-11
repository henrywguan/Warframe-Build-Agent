import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateEhp, formatEhpEstimate } from "./ehp.js";

describe("ehp estimator", () => {
  it("applies armor and flat shields", () => {
    const est = estimateEhp({ health: 300, shields: 300, armor: 300 });
    assert.equal(est.healthEhp, 600);
    assert.equal(est.totalEhp, 900);
  });

  it("applies damage reduction multiplicatively with adaptation", () => {
    const est = estimateEhp({
      health: 1000,
      shields: 0,
      armor: 0,
      damageReduction: 0.5,
      adaptationStacks: 5,
    });
    assert.ok(est.combinedDr > 0.5);
    assert.ok(est.totalEhp > 2000);
  });

  it("formats a readable summary", () => {
    const text = formatEhpEstimate({ health: 100, shields: 50, armor: 100 });
    assert.match(text, /Total EHP/);
    assert.match(text, /armor\/300/);
  });
});
