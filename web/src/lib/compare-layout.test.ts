import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { looksLikeAbCompare, splitAbCompare } from "./compare-layout.ts";

describe("compare-layout", () => {
  it("keeps plain messages as plain", () => {
    const layout = splitAbCompare("Ordis is online.");
    assert.equal(layout.kind, "plain");
  });

  it("splits DPS A/B compares into two columns", () => {
    const text = [
      "Modded DPS compare under 8 mods (preset: typical)",
      "Burst winner: Coda Hema (12.0%)",
      "",
      "## Coda Hema (Rifle) — modded DPS estimate",
      "• Burst DPS: 100",
      "",
      "## Braton Prime (Rifle) — modded DPS estimate",
      "• Burst DPS: 80",
      "",
      "Caveats: offline estimate only.",
    ].join("\n");

    assert.equal(looksLikeAbCompare(text, ["estimate_modded_dps"]), true);
    const layout = splitAbCompare(text, ["estimate_modded_dps"]);
    assert.equal(layout.kind, "ab");
    if (layout.kind !== "ab") return;
    assert.match(layout.intro, /Burst winner/);
    assert.match(layout.a.title, /Coda Hema/);
    assert.match(layout.b.title, /Braton Prime/);
    assert.match(layout.outro, /Caveats/);
  });
});
