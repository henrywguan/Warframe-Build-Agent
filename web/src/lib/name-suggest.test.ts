import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  applySuggestPick,
  splitSuggestList,
  suggestNames,
  wfmSuggestDictionary,
} from "./name-suggest.ts";

const here = dirname(fileURLToPath(import.meta.url));
const suggestPack = JSON.parse(
  readFileSync(join(here, "../data/offline-suggest.json"), "utf8"),
) as {
  mods: string[];
  arcanes: string[];
  items: { primary: string[] };
};

describe("name-suggest", () => {
  it("ranks prefix matches first and skips empty queries", () => {
    const dict = ["Serration", "Split Chamber", "Galvanized Aptitude", "Galvanized Chamber"];
    assert.deepEqual(suggestNames("", dict), []);
    assert.deepEqual(suggestNames("galv", dict).slice(0, 2), [
      "Galvanized Aptitude",
      "Galvanized Chamber",
    ]);
    assert.ok(suggestNames("serr", dict).includes("Serration"));
  });

  it("replaces the last list token when picking a mod", () => {
    assert.deepEqual(splitSuggestList("Serration, Galv"), {
      prefix: "Serration,",
      token: "Galv",
    });
    assert.equal(
      applySuggestPick("Serration, Galv", "Galvanized Chamber", "list"),
      "Serration, Galvanized Chamber, ",
    );
    assert.equal(applySuggestPick("", "Soma Prime", "single"), "Soma Prime");
  });

  it("builds a unique /wfm dictionary from mods, arcanes, and items", () => {
    const names = wfmSuggestDictionary({
      mods: ["Primed Continuity", "Serration"],
      arcanes: ["Arcane Energize"],
      items: {
        warframe: ["Ash"],
        primary: ["Soma Prime"],
        secondary: [],
        melee: [],
        companion: ["Carrier"],
      },
    });
    assert.ok(names.includes("Primed Continuity"));
    assert.ok(names.includes("Soma Prime"));
    assert.ok(names.includes("Arcane Energize"));
  });

  it("ships a WFCD mod-name pack for the web UI", () => {
    assert.ok(suggestPack.mods.includes("Serration"));
    assert.ok(suggestPack.mods.includes("Primed Continuity"));
    assert.ok(suggestPack.items.primary.includes("Soma Prime"));
    assert.ok(suggestPack.arcanes.includes("Arcane Energize"));
  });
});
