import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runOfflineDps } from "./offline-dps.ts";

describe("offline modded dps", () => {
  it("estimates a single weapon with a preset", async () => {
    const text = await runOfflineDps({
      weapon: "Coda Hema",
      preset: "rifle-viral-heat",
    });
    assert.match(text, /Coda Hema/);
    assert.match(text, /Burst DPS/);
  });

  it("compares two weapons under a typical preset", async () => {
    const text = await runOfflineDps({
      weapon: "Torid",
      weaponB: "Ignis Wraith",
      preset: "rifle-viral-heat",
    });
    assert.match(text, /Torid/);
    assert.match(text, /Ignis Wraith/);
    assert.match(text, /Burst winner/);
  });
});
