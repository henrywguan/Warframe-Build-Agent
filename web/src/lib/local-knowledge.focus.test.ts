import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupLocalKnowledge } from "./local-knowledge.ts";

describe("local knowledge focus", () => {
  it("returns Enkaus item facts for a maximum-damage build ask", async () => {
    const text = await lookupLocalKnowledge(
      "Please provide me the maximum damage build for Enkaus",
    );
    assert.match(text, /## Enkaus \(weapon\)/);
    assert.match(text, /ONLINE_SEARCH_CONFIRMATION_REQUIRED for Enkaus/);
    assert.doesNotMatch(text, /# Mechanics \/ resource digests/);
    assert.doesNotMatch(text, /## Blast/i);
  });
});
