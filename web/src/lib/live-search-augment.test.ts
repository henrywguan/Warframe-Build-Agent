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
      llmMode: true,
    });
    assert.equal(plain.extraTools.length, 0);

    const gated = await maybeAugmentLookupWithLiveSearch({
      toolName: "lookup_local_knowledge",
      rawArgs: JSON.stringify({ query: "Enkaus" }),
      result: `${ONLINE_SEARCH_CONFIRMATION_MARKER} for Enkaus\nNo builds`,
      onlineSearch: false,
      llmMode: false,
    });
    assert.equal(gated.extraTools.length, 0);
    assert.equal(gated.result, `${ONLINE_SEARCH_CONFIRMATION_MARKER} for Enkaus\nNo builds`);
  });

  it("skips auto community crawl when saving a personal card", async () => {
    const skipped = await maybeAugmentLookupWithLiveSearch({
      toolName: "lookup_local_knowledge",
      rawArgs: JSON.stringify({ query: "Soma Prime" }),
      result: `${ONLINE_SEARCH_CONFIRMATION_MARKER} for Soma Prime\nNo builds`,
      onlineSearch: true,
      llmMode: true,
      skipLiveSearch: true,
    });
    assert.equal(skipped.extraTools.length, 0);
    assert.equal(
      skipped.result,
      `${ONLINE_SEARCH_CONFIRMATION_MARKER} for Soma Prime\nNo builds`,
    );
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
