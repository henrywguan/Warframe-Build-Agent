import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_TOOL_ROUNDS,
  MAX_TOOL_ROUNDS_AI,
  TOOL_BUDGET_EXHAUSTED_PROMPT,
  dedupeToolCall,
  maxToolRoundsForMode,
} from "./tool-loop.ts";

describe("tool-loop", () => {
  it("exposes a finite tool budget and finalize prompt", () => {
    assert.ok(MAX_TOOL_ROUNDS >= 4);
    assert.ok(MAX_TOOL_ROUNDS_AI >= MAX_TOOL_ROUNDS);
    assert.equal(maxToolRoundsForMode(false), MAX_TOOL_ROUNDS);
    assert.equal(maxToolRoundsForMode(true), MAX_TOOL_ROUNDS_AI);
    assert.match(TOOL_BUDGET_EXHAUSTED_PROMPT, /final/i);
    assert.match(TOOL_BUDGET_EXHAUSTED_PROMPT, /Do not call/i);
  });

  it("stubs duplicate tool calls so local models can stop looping", () => {
    const seen = new Set<string>();
    const first = dedupeToolCall(seen, "lookup_local_knowledge", '{"query":"Hema"}');
    assert.equal(first.duplicate, false);
    const second = dedupeToolCall(seen, "lookup_local_knowledge", '{"query":"Hema"}');
    assert.equal(second.duplicate, true);
    assert.match(second.stub ?? "", /DUPLICATE_TOOL_CALL/);
    const other = dedupeToolCall(seen, "get_cycles", "{}");
    assert.equal(other.duplicate, false);
  });
});
