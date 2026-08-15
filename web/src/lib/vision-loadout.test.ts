import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOADOUT_VISION_SYSTEM,
  buildVisionReadMessages,
  extractJsonLoadout,
} from "./vision-loadout.ts";

describe("vision-loadout", () => {
  it("extracts JSON loadouts from model text", () => {
    const parsed = extractJsonLoadout(
      'Here you go:\n{"itemName":"Coda Hema","mods":["Serration"],"arcanes":["Arcane Acceleration"]}\n',
    );
    assert.equal(parsed?.itemName, "Coda Hema");
    assert.deepEqual(parsed?.mods, ["Serration"]);
    assert.deepEqual(parsed?.arcanes, ["Arcane Acceleration"]);
    assert.equal(extractJsonLoadout("no json here"), null);
  });

  it("builds a no-tools vision read payload with image + system prompt", () => {
    const messages = buildVisionReadMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "Compare my build" },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAA" } },
        ],
      },
    ]);
    assert.equal(messages[0]?.role, "system");
    assert.match(String(messages[0]?.content), /Ordis/);
    assert.match(LOADOUT_VISION_SYSTEM, /Item:/);
    const user = messages[1];
    assert.equal(user?.role, "user");
    assert.ok(Array.isArray(user?.content));
    const parts = user?.content as Array<{ type: string }>;
    assert.ok(parts.some((p) => p.type === "image_url"));
  });
});
