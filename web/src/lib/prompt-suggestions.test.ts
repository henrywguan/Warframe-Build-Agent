import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FALLBACK_SLASH_SUGGESTIONS,
  deriveContextualSuggestions,
  extractTopicHint,
  resolvePromptSuggestions,
} from "./prompt-suggestions.ts";

describe("prompt-suggestions", () => {
  it("extracts item topics from common phrasings", () => {
    assert.equal(extractTopicHint("Best build for Coda Hema"), "Coda Hema");
    assert.equal(extractTopicHint("/farm Kuva Zarr"), "Kuva Zarr");
    assert.equal(extractTopicHint("/market mirage_prime_set"), "mirage_prime_set");
    assert.equal(extractTopicHint("hello operator"), null);
  });

  it("offers starter prompts on a fresh welcome-only thread", () => {
    const chips = deriveContextualSuggestions([
      {
        id: "welcome",
        role: "assistant",
        content: "Operator? Ordis is online.",
      },
    ]);
    assert.ok(chips.length >= 2);
    assert.ok(chips.every((c) => c.kind === "prompt"));
    assert.ok(chips.some((c) => /sortie|build|patch/i.test(c.label)));
  });

  it("derives follow-ups from assistant tool usage + topic", () => {
    const chips = deriveContextualSuggestions([
      { id: "welcome", role: "assistant", content: "hi" },
      { id: "u1", role: "user", content: "Best build for Coda Hema" },
      {
        id: "a1",
        role: "assistant",
        content: "Here are top Coda Hema builds…",
        toolsUsed: ["lookup_local_builds"],
      },
    ]);
    assert.ok(chips.length >= 1);
    assert.ok(chips.some((c) => c.prompt.toLowerCase().includes("coda hema")));
    assert.ok(chips.every((c) => c.kind === "prompt"));
  });

  it("falls back to slash chips when nothing useful matches", () => {
    const chips = resolvePromptSuggestions([
      { id: "welcome", role: "assistant", content: "hi" },
      { id: "u1", role: "user", content: "Thanks" },
      { id: "a1", role: "assistant", content: "You're welcome, Operator." },
    ]);
    assert.deepEqual(
      chips.map((c) => c.prompt),
      FALLBACK_SLASH_SUGGESTIONS.map((c) => c.prompt),
    );
    assert.ok(chips.every((c) => c.kind === "slash"));
  });

  it("suggests worldstate follow-ups after fissure tools", () => {
    const chips = resolvePromptSuggestions([
      { id: "u1", role: "user", content: "/fissures sp" },
      {
        id: "a1",
        role: "assistant",
        content: "Steel Path fissures…",
        toolsUsed: ["get_fissures"],
      },
    ]);
    assert.ok(chips.some((c) => c.prompt === "/sortie" || c.prompt === "/cycles"));
    assert.equal(chips.some((c) => c.kind === "slash"), false);
  });
});
