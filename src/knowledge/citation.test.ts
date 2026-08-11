import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCitationBlock } from "./citation.js";

describe("citation block", () => {
  it("lists sources with kind labels", () => {
    const text = formatCitationBlock([
      { kind: "pack", label: "Offline knowledge pack", asOf: "2026-08-01" },
      { kind: "market", label: "mirage_prime_set" },
    ]);
    assert.match(text, /Offline pack/);
    assert.match(text, /Warframe\.market/);
    assert.match(text, /as of 2026-08-01/);
  });

  it("always includes patch-sensitive disclaimer", () => {
    const text = formatCitationBlock([]);
    assert.match(text, /Patch-sensitive/);
  });
});
