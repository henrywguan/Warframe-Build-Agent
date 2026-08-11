import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REFINEMENT_ODDS, formatRelicAdvice } from "./relic-ev.js";

describe("relic expected value", () => {
  it("exposes wiki-standard radiant rare odds", () => {
    assert.equal(REFINEMENT_ODDS.Radiant.rare, 0.16);
  });

  it("formats odds table and radshare tips", () => {
    const text = formatRelicAdvice("Loki Prime Neuroptics", { refinement: "radiant" });
    assert.match(text, /Radiant/);
    assert.match(text, /16%/);
    assert.match(text, /lookup/);
  });

  it("includes refinement highlight when selected", () => {
    const text = formatRelicAdvice("Neo O1", { refinement: "Flawless" });
    assert.match(text, /Flawless/);
    assert.match(text, /7%/);
  });
});
