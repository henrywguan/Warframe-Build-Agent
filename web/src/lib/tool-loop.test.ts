import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTEXT_OVERFLOW_PLAYER_MESSAGE,
  GENERAL_AGENT_MAX_TOOL_ROUNDS,
  MAX_TOOL_ROUNDS,
  SKIPPED_FOR_SAVE_BUILD,
  TOOL_BUDGET_EXHAUSTED_PROMPT,
  clipMessagesForContextRetry,
  clipToolResult,
  dedupeToolCall,
  isContextOverflowError,
  toolCallDedupeKey,
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

  it("treats search_community_builds as once per turn regardless of args", () => {
    const seen = new Set<string>();
    const first = dedupeToolCall(
      seen,
      "search_community_builds",
      '{"query":"Enkaus"}',
    );
    assert.equal(first.duplicate, false);
    const second = dedupeToolCall(
      seen,
      "search_community_builds",
      '{"query":"Soma Prime"}',
    );
    assert.equal(second.duplicate, true);
    assert.equal(toolCallDedupeKey("search_community_builds", "{}"), "search_community_builds");
  });

  it("clips oversized tool results and detects context overflow", () => {
    const clipped = clipToolResult("lookup_local_knowledge", "x".repeat(5000), 100);
    assert.equal(clipped.startsWith("x".repeat(100)), true);
    assert.match(clipped, /clipped 4900 chars/);
    assert.equal(clipToolResult("save_build", "y".repeat(5000)).length, 5000);
    assert.equal(
      isContextOverflowError(
        new Error(
          '400 {"error":{"code":400,"message":"request (8567 tokens) exceeds the available context size (8192 tokens), try increasing it","type":"exceed_context_size_error","n_prompt_tokens":8567,"n_ctx":8192}}',
        ),
      ),
      true,
    );
    assert.equal(isContextOverflowError(new Error("invalid api key")), false);
    assert.match(CONTEXT_OVERFLOW_PLAYER_MESSAGE, /8192/);
    assert.match(SKIPPED_FOR_SAVE_BUILD, /save_build/);
  });

  it("clips string contents without dropping tool messages", () => {
    const clipped = clipMessagesForContextRetry([
      { role: "system", content: "short" },
      { role: "tool", content: "t".repeat(2000), tool_call_id: "1" },
      { role: "assistant", tool_calls: [{ id: "1" }] },
    ]);
    assert.equal(clipped.length, 3);
    assert.equal(clipped[0]?.content, "short");
    assert.ok(typeof clipped[1]?.content === "string" && clipped[1].content.length < 2000);
    assert.deepEqual(clipped[2]?.tool_calls, [{ id: "1" }]);
  });
});
