import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatActiveLlmReply,
  formatLlmConnectionError,
  isLlmConnectionError,
  llmConfigReady,
  looksLikeModelIdentityQuestion,
  parseClientLlm,
  resolveApiKey,
  resolveBaseUrl,
  resolveModel,
} from "./model-config.ts";

describe("model-config", () => {
  it("parses client llm payloads", () => {
    const parsed = parseClientLlm({
      apiKey: " ollama ",
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "qwen2.5",
    });
    assert.deepEqual(parsed, {
      apiKey: "ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "qwen2.5",
    });
  });

  it("treats api key as ready signal", () => {
    assert.equal(llmConfigReady({ apiKey: "", baseUrl: "", model: "", visionModel: "" }), false);
    assert.equal(
      llmConfigReady({ apiKey: "ollama", baseUrl: "", model: "", visionModel: "" }),
      true,
    );
  });

  it("prefers client overrides over empty env", () => {
    assert.equal(resolveApiKey({ apiKey: "ollama" }), "ollama");
    assert.equal(resolveBaseUrl({ baseUrl: "http://127.0.0.1:11434/v1" }), "http://127.0.0.1:11434/v1");
    assert.equal(resolveModel({ model: "qwen2.5" }, false), "qwen2.5");
    assert.equal(resolveModel({ visionModel: "llava", model: "qwen2.5" }, true), "llava");
  });

  it("detects model-identity questions and formats the reply", () => {
    assert.equal(
      looksLikeModelIdentityQuestion("What model LLM is this agent running"),
      true,
    );
    assert.equal(looksLikeModelIdentityQuestion("/model"), true);
    assert.equal(looksLikeModelIdentityQuestion("which llm are you using?"), true);
    assert.equal(looksLikeModelIdentityQuestion("best Mesa build"), false);
    assert.match(
      formatActiveLlmReply({
        model: "qwen2.5",
        baseUrl: "http://127.0.0.1:11434/v1",
        mode: "llm",
      }),
      /\*\*qwen2\.5\*\*/,
    );
    assert.match(
      formatActiveLlmReply({ model: "local-knowledge", mode: "local-knowledge" }),
      /local-knowledge/,
    );
  });

  it("detects LLM connection failures", () => {
    assert.equal(isLlmConnectionError(new Error("Connection error.")), true);
    assert.equal(
      isLlmConnectionError(
        Object.assign(new Error("request failed"), {
          cause: new Error("connect ECONNREFUSED 127.0.0.1:11434"),
        }),
      ),
      true,
    );
    assert.equal(isLlmConnectionError(new Error("invalid api key")), false);
    assert.match(
      formatLlmConnectionError(new Error("Connection error."), {
        baseUrl: "http://127.0.0.1:11434/v1",
      }),
      /127\.0\.0\.1:11434/,
    );
    assert.match(
      formatLlmConnectionError(new Error("Connection error."), {
        baseUrl: "http://127.0.0.1:11434/v1",
      }),
      /Clear/,
    );
  });
});
