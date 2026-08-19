import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOfflineSuggestPack,
  COMPANION_SUGGEST_NAMES,
  slimModsFromWfcd,
  slotNamesFromCatalog,
} from "./mods-catalog.ts";
import type { CatalogItem } from "./types.ts";

describe("WFCD mod-name catalog", () => {
  it("keeps unique mod names and skips Focus/Riven rows", () => {
    const rows = slimModsFromWfcd([
      { name: "Serration", type: "Primary Mod", tradable: true, wikiaUrl: "https://wiki.warframe.com/w/Serration" },
      { name: "serration", type: "Primary Mod" },
      { name: "Inner Might", type: "Focus Way" },
      { name: "Melee Riven Mod", type: "Melee Riven Mod" },
      { name: "Primed Continuity", type: "Warframe Mod", tradable: true },
      { name: "" },
    ]);
    assert.deepEqual(
      rows.map((r) => r.name),
      ["Primed Continuity", "Serration"],
    );
    assert.equal(rows[1]?.tradable, true);
  });

  it("maps catalog weapons/frames into suggest slots", () => {
    const catalog: CatalogItem[] = [
      { id: "ash", name: "Ash", kind: "warframe", category: "Warframes", stats: {} },
      { id: "soma-prime", name: "Soma Prime", kind: "weapon", category: "Primary", stats: {} },
      { id: "lex", name: "Lex", kind: "weapon", category: "Secondary", stats: {} },
      { id: "skana", name: "Skana", kind: "weapon", category: "Melee", stats: {} },
    ];
    const items = slotNamesFromCatalog(catalog);
    assert.deepEqual(items.warframe, ["Ash"]);
    assert.deepEqual(items.primary, ["Soma Prime"]);
    assert.ok(items.companion.includes("Carrier"));
    const pack = buildOfflineSuggestPack({
      mods: [{ name: "Serration" }],
      catalog,
      arcanes: ["Arcane Energize"],
      extraModNames: ["Galvanized Aptitude"],
    });
    assert.ok(pack.mods.includes("Serration"));
    assert.ok(pack.mods.includes("Galvanized Aptitude"));
    assert.deepEqual(pack.arcanes, ["Arcane Energize"]);
    assert.ok(COMPANION_SUGGEST_NAMES.length > 5);
  });
});
