import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateForma, formatFormaPlan } from "./forma.js";

describe("forma planner", () => {
  it("estimates forma from capacity deficit", () => {
    const plan = estimateForma({ capacityNeeded: 74, currentCapacity: 60 });
    assert.equal(plan.deficit, 14);
    assert.equal(plan.estimatedForma, 7);
  });

  it("returns zero when capacity is sufficient", () => {
    const plan = estimateForma({ capacityNeeded: 55, currentCapacity: 60 });
    assert.equal(plan.estimatedForma, 0);
  });

  it("mentions polarity in formatted output", () => {
    const text = formatFormaPlan({
      capacityNeeded: 80,
      matchingPolarities: 4,
    });
    assert.match(text, /Estimated Forma: 10/);
    assert.match(text, /Polarity matching/);
  });
});
