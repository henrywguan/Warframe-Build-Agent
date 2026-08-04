import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  llmConfigReady,
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
});
