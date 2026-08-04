import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ONLINE_SEARCH_CONFIRMATION_MARKER } from "./source-policy.ts";
import { fallbackFromToolResults, maybeAugmentLookupWithLiveSearch } from "./live-search-augment.ts";

describe("live-search-augment", () => {
  it("does nothing without confirmation marker or when toggles are off", async () => {
    const plain = await maybeAugmentLookupWithLiveSearch({
      toolName: "lookup_local_knowledge",
      rawArgs: JSON.stringify({ query: "Enkaus" }),
      result: "Just facts about Enkaus",
      onlineSearch: true,
      aiChat: true,
    });
    assert.equal(plain.extraTools.length, 0);

    const gated = await maybeAugmentLookupWithLiveSearch({
      toolName: "lookup_local_knowledge",
      rawArgs: JSON.stringify({ query: "Enkaus" }),
      result: `${ONLINE_SEARCH_CONFIRMATION_MARKER} for Enkaus\nNo builds`,
      onlineSearch: false,
      aiChat: false,
    });
    assert.equal(gated.extraTools.length, 0);
    assert.equal(gated.result, `${ONLINE_SEARCH_CONFIRMATION_MARKER} for Enkaus\nNo builds`);
  });

  it("builds a fallback from tool payloads instead of an empty reply", () => {
    const text = fallbackFromToolResults(
      ["## Enkaus (weapon)\nCorrosive ink rifle\nONLINE_SEARCH_CONFIRMATION_REQUIRED for Enkaus"],
      ["lookup_local_knowledge"],
    );
    assert.match(text, /Enkaus/);
    assert.doesNotMatch(text, /I do not have a response/);
  });
});
