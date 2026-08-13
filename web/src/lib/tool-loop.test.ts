import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GENERAL_AGENT_MAX_TOOL_ROUNDS,
  MAX_TOOL_ROUNDS,
  TOOL_BUDGET_EXHAUSTED_PROMPT,
  dedupeToolCall,
} from "./tool-loop.ts";

describe("tool-loop", () => {
  it("exposes a finite tool budget and finalize prompt", () => {
    assert.ok(MAX_TOOL_ROUNDS >= 4);
    assert.ok(GENERAL_AGENT_MAX_TOOL_ROUNDS >= 10);
    assert.ok(GENERAL_AGENT_MAX_TOOL_ROUNDS > MAX_TOOL_ROUNDS);
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
