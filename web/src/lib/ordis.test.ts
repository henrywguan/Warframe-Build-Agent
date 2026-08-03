import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SPEAKING_MS,
  deriveOrdisMood,
  ordisCaption,
  shouldTriggerSpeaking,
} from "./ordis.ts";

describe("ordis mood helpers", () => {
  it("derives thinking while pending, else speaking/idle", () => {
    assert.equal(deriveOrdisMood(true, false), "thinking");
    assert.equal(deriveOrdisMood(true, true), "thinking");
    assert.equal(deriveOrdisMood(false, true), "speaking");
    assert.equal(deriveOrdisMood(false, false), "idle");
  });

  it("exposes speaking captions and duration", () => {
    assert.equal(ordisCaption("speaking"), "Ordis is transmitting…");
    assert.equal(ordisCaption("thinking"), "Consulting the ship’s systems…");
    assert.match(ordisCaption("idle"), /standing by/i);
    assert.equal(SPEAKING_MS, 3400);
  });

  it("triggers speaking on assistant replies, not welcome/pending/user", () => {
    assert.equal(
      shouldTriggerSpeaking({
        role: "assistant",
        id: "reply-1",
        pending: false,
      }),
      true,
    );
    assert.equal(
      shouldTriggerSpeaking({
        role: "assistant",
        id: "welcome",
        pending: false,
      }),
      false,
    );
    assert.equal(
      shouldTriggerSpeaking({
        role: "assistant",
        id: "reply-1",
        pending: true,
      }),
      false,
    );
    assert.equal(
      shouldTriggerSpeaking({
        role: "user",
        id: "u1",
        pending: false,
      }),
      false,
    );
  });
});
