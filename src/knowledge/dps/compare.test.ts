import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { compareWeaponsDps, estimateModdedDps } from "./compare.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("modded dps compare", () => {
  it("estimates Coda Hema with a viral-heat preset", async () => {
    const result = await estimateModdedDps("Coda Hema", {
      repoRoot,
      preset: "rifle-viral-heat",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.text, /Coda Hema/);
    assert.ok(result.estimate.modded.burstDps > 1000);
  });

  it("compares Torid vs Ignis Wraith under a typical rifle preset", async () => {
    const result = await compareWeaponsDps("Torid", "Ignis Wraith", {
      repoRoot,
      preset: "rifle-viral-heat",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.text, /Torid/);
    assert.match(result.text, /Ignis Wraith/);
    assert.match(result.text, /Burst winner/);
    assert.ok(result.compare.a.modded.burstDps > 0);
    assert.ok(result.compare.b.modded.burstDps > 0);
  });
});
