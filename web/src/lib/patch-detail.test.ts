import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPatchDetail,
  parsePatchDetailHtml,
  resolvePatchDetailUrl,
} from "./patch-detail.ts";

const SAMPLE = `
<div class="update-name">Mesa Heirloom: Hotfix 43.0.8</div>
<date class="date">Jul 13, 2026</date>
<div class="content">
  <p>This hotfix brings Vessel customization for all Tenno!</p>
  <p><strong>Additions:</strong></p>
  <ul><li>Added Vessel customization to all Dry Docks.</li></ul>
</div>
<div class="ButtonGroup detail-navigation"></div>
`;

describe("web patch-detail", () => {
  it("resolves versions to official URLs", () => {
    assert.equal(
      resolvePatchDetailUrl("43.0.8"),
      "https://www.warframe.com/en/patch-notes/pc/43-0-8",
    );
    assert.equal(resolvePatchDetailUrl("latest"), null);
  });

  it("parses and formats detail pages", () => {
    const detail = parsePatchDetailHtml(
      SAMPLE,
      "https://www.warframe.com/en/patch-notes/pc/43-0-8",
    );
    assert.match(detail.body, /Vessel customization/);
    assert.match(formatPatchDetail(detail), /do not invent hotfix contents/);
  });
});
