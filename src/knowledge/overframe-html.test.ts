import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { parseOverframeHtmlFile } from "./overframe-html.js";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("overframe offline HTML extract", () => {
  it("parses item-page top build links without network", () => {
    const html = readFileSync(path.join(here, "fixtures/overframe-item.html"), "utf8");
    const row = parseOverframeHtmlFile(html, { itemName: "Excalibur" });
    assert.ok(row);
    assert.equal(row!.itemName, "Excalibur");
    assert.equal(row!.builds.length, 3);
    assert.match(row!.builds[0]?.url || "", /build\/111/);
  });

  it("parses build-page mods/arcanes from __NEXT_DATA__", () => {
    const html = readFileSync(path.join(here, "fixtures/overframe-build.html"), "utf8");
    const row = parseOverframeHtmlFile(html, {
      itemName: "Excalibur",
      filePath: "excalibur-build.html",
    });
    assert.ok(row);
    assert.equal(row!.builds.length, 1);
    assert.ok(row!.builds[0]?.mods?.includes("Umbral Intensify"));
    assert.ok(row!.builds[0]?.arcanes?.includes("Arcane Energize"));
  });

  it("rejects Cloudflare challenge HTML", () => {
    const row = parseOverframeHtmlFile(
      "<!DOCTYPE html><title>Just a moment...</title><body>Enable JavaScript</body>",
    );
    assert.equal(row, null);
  });
});
