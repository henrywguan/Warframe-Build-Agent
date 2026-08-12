import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPatchDetail,
  htmlFragmentToPlainText,
  parsePatchDetailHtml,
  resolvePatchDetailUrl,
} from "./detail.js";

const SAMPLE_DETAIL_HTML = `
<html>
  <head><title>Warframe: Mesa Heirloom: Hotfix 43.0.8</title></head>
  <body>
    <div id="patch-notes">
      <div class="update-name">Mesa Heirloom: Hotfix 43.0.8</div>
      <date class="date">Jul 13, 2026</date>
      <div class="content">
        <p><em>Image Description: A Vessel in Dry Dock.</em></p>
        <p>This hotfix brings Vessel customization for all Tenno!</p>
        <p><strong>Additions:</strong></p>
        <ul>
          <li>Added Vessel customization to all Dry Docks (including those in Dojos).</li>
        </ul>
        <p>Known issues: <a href="https://forums.warframe.com/topic/1509550">thread</a></p>
      </div>
      <div class="ButtonGroup detail-navigation"><a href="/forums">Discuss</a></div>
    </div>
  </body>
</html>
`;

describe("resolvePatchDetailUrl", () => {
  it("maps versions and slugs to official PC URLs", () => {
    assert.equal(
      resolvePatchDetailUrl("43.0.8"),
      "https://www.warframe.com/en/patch-notes/pc/43-0-8",
    );
    assert.equal(
      resolvePatchDetailUrl("43-0-8"),
      "https://www.warframe.com/en/patch-notes/pc/43-0-8",
    );
    assert.equal(
      resolvePatchDetailUrl(
        "https://www.warframe.com/en/patch-notes/pc/43-0-8",
      ),
      "https://www.warframe.com/en/patch-notes/pc/43-0-8",
    );
    assert.equal(resolvePatchDetailUrl("latest"), null);
    assert.equal(resolvePatchDetailUrl(""), null);
  });

  it("rejects non-official hosts", () => {
    assert.throws(
      () => resolvePatchDetailUrl("https://example.com/en/patch-notes/pc/43-0-8"),
      /Only official/,
    );
  });
});

describe("parsePatchDetailHtml", () => {
  it("extracts title, date, and body text from a hotfix page", () => {
    const detail = parsePatchDetailHtml(
      SAMPLE_DETAIL_HTML,
      "https://www.warframe.com/en/patch-notes/pc/43-0-8",
    );
    assert.equal(detail.title, "Mesa Heirloom: Hotfix 43.0.8");
    assert.equal(detail.date, "Jul 13, 2026");
    assert.equal(detail.type, "Hotfix");
    assert.equal(detail.version, "43.0.8");
    assert.match(detail.body, /Vessel customization/);
    assert.match(detail.body, /- Added Vessel customization/);
    assert.equal(detail.truncated, false);
    assert.ok(detail.sectionHeadings.includes("Additions"));
  });

  it("truncates long bodies and keeps a synopsis-friendly note", () => {
    const longLis = Array.from({ length: 200 }, (_, i) => `<li>Fix ${i}</li>`).join(
      "",
    );
    const html = SAMPLE_DETAIL_HTML.replace(
      "<li>Added Vessel customization to all Dry Docks (including those in Dojos).</li>",
      longLis,
    );
    const detail = parsePatchDetailHtml(
      html,
      "https://www.warframe.com/en/patch-notes/pc/43-0-8",
      { maxChars: 400 },
    );
    assert.equal(detail.truncated, true);
    assert.ok(detail.body.length <= 400);
    const formatted = formatPatchDetail(detail);
    assert.match(formatted, /truncated for length/);
    assert.match(formatted, /do not invent hotfix contents/);
  });
});

describe("htmlFragmentToPlainText", () => {
  it("turns list markup into bullets", () => {
    const text = htmlFragmentToPlainText(
      "<p><strong>Fixes:</strong></p><ul><li>One&nbsp;thing</li><li>Two</li></ul>",
    );
    assert.match(text, /Fixes:/);
    assert.match(text, /- One thing/);
    assert.match(text, /- Two/);
  });

  it("keeps multiline list items on one bullet line", () => {
    const text = htmlFragmentToPlainText(
      "<ul><li>\nAdded Vessel customization.\n</li></ul>",
    );
    assert.match(text, /^- Added Vessel customization\./m);
    assert.doesNotMatch(text, /^-\s*$/m);
  });
});
