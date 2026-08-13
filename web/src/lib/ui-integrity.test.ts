import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(here, "../app/page.tsx"), "utf8");

describe("web UI wiring integrity", () => {
  it("keeps Ordis stage, chat panel, composer, and API linked", () => {
    for (const needle of [
      "OrdisStage",
      "MessageBody",
      "deriveOrdisMood",
      "shouldTriggerSpeaking",
      'aria-label="Chat"',
      "/api/chat",
      "/api/health",
      "/api/auth",
      "sendMessage",
      "SUGGESTIONS",
      "BrandHeader",
      "Transmission log",
      "clearChat",
      "Clear",
      "AI on",
      "aiChat",
      "general agent",
      "Warframe advisor",
      "LLM / Ollama",
      "Online search",
      "onlineSearch",
      "LlmSettingsPanel",
      "Attach",
      "image_url",
      "attachment",
      "topZone",
    ]) {
      assert.match(pageSource, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("wires suggestion chips and send controls to sendMessage", () => {
    assert.match(pageSource, /onClick=\{\(\) => void sendMessage\(suggestion\)\}/);
    assert.match(pageSource, /onSubmit=\{onSubmit\}/);
    assert.match(pageSource, /type="submit"/);
  });

  it("keeps clear chat control wired to clearChat", () => {
    assert.match(pageSource, /function clearChat\(\)/);
    assert.match(pageSource, /onClick=\{clearChat\}/);
    assert.match(pageSource, /aria-label="Clear chat log"/);
  });
});
