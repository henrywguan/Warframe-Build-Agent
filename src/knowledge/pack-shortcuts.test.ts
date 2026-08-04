import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractAcquisitionBlob } from "./pack-shortcuts.ts";

describe("pack-shortcuts", () => {
  it("extracts Acquisition sections from wiki extracts", () => {
    const extract = [
      "Enkaus is a beam rifle.",
      "",
      "Acquisition",
      "Buy from Aspirant Zorba using Atramentum.",
      "Requires Chains of Harrow.",
      "",
      "Crafting",
      "10 Orokin Cells.",
    ].join("\n");
    const blob = extractAcquisitionBlob(extract);
    assert.ok(blob);
    assert.match(blob!, /Aspirant Zorba/);
    assert.match(blob!, /Chains of Harrow/);
    assert.doesNotMatch(blob!, /Orokin Cells/);
  });

  it("returns null when Acquisition is missing", () => {
    assert.equal(extractAcquisitionBlob("Just a description."), null);
  });
});
