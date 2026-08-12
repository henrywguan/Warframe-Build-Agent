import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveChatTurn } from "./chat-turn.ts";

describe("resolveChatTurn", () => {
  it("returns slash-command replies without calling the model", async () => {
    let modelCalls = 0;
    const result = await resolveChatTurn(
      [{ role: "user", content: "/list" }],
      {
        runSlash: async () => ({
          handled: true,
          content: "catalog",
          toolsUsed: [],
        }),
        runModel: async () => {
          modelCalls += 1;
          return { content: "model", toolsUsed: [], model: "gpt" };
        },
      },
    );
    assert.equal(result.model, "slash-command");
    assert.equal(result.message.content, "catalog");
    assert.equal(modelCalls, 0);
  });

  it("falls through to the model for plain language", async () => {
    const result = await resolveChatTurn(
      [{ role: "user", content: "Budget Coda Hema for Steel Path?" }],
      {
        runModel: async () => ({
          content: "Go viral + heat with comfortable ammo.",
          toolsUsed: ["get_worldstate_summary"],
          model: "gpt-test",
        }),
      },
    );
    assert.equal(result.model, "gpt-test");
    assert.match(result.message.content, /viral/i);
    assert.deepEqual(result.toolsUsed, ["get_worldstate_summary"]);
  });

  it("answers model-identity questions from activeLlm without calling the model", async () => {
    let modelCalls = 0;
    const result = await resolveChatTurn(
      [{ role: "user", content: "What model LLM is this agent running" }],
      {
        activeLlm: {
          model: "qwen2.5",
          baseUrl: "http://127.0.0.1:11434/v1",
          mode: "llm",
        },
        runModel: async () => {
          modelCalls += 1;
          return { content: "I am GPT", toolsUsed: [], model: "wrong" };
        },
      },
    );
    assert.equal(result.model, "qwen2.5");
    assert.match(result.message.content, /\*\*qwen2\.5\*\*/);
    assert.equal(modelCalls, 0);
  });

  it("uses the local chatbot when preferLocal is set", async () => {
    let modelCalls = 0;
    const result = await resolveChatTurn(
      [{ role: "user", content: "Tell me about Coda Hema" }],
      {
        preferLocal: true,
        runLocal: async () => ({
          content: "Local pack says Coda Hema is a primary.",
          toolsUsed: ["lookup_local_knowledge"],
          model: "local-knowledge",
        }),
        runModel: async () => {
          modelCalls += 1;
          return { content: "model", toolsUsed: [], model: "gpt" };
        },
      },
    );
    assert.equal(result.model, "local-knowledge");
    assert.match(result.message.content, /Coda Hema/);
    assert.equal(modelCalls, 0);
  });
});
