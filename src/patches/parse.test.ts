import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeNewEntries, parsePatchNotesHtml } from "./parse.js";

const SAMPLE_HTML = `
<ul>
  <li>
    <span class="tag"><span class="label">Newest</span></span>
    <a href="https://www.warframe.com/en/patch-notes/pc/43-0-8">Mesa Heirloom: Hotfix 43.0.8</a>
  </li>
  <li>
    <a href="https://www.warframe.com/en/patch-notes/pc/43-0-7">Mesa Heirloom: Hotfix 43.0.7</a>
  </li>
  <li>
    <a href="/patch-notes/pc/43-0-0">Update 43: Jade Shadows: Constellations</a>
  </li>
</ul>
`;

describe("parsePatchNotesHtml", () => {
  it("extracts hotfix/update entries with newest flag and versions", () => {
    const entries = parsePatchNotesHtml(SAMPLE_HTML);
    assert.equal(entries.length, 3);
    assert.equal(entries[0]?.id, "43-0-8");
    assert.equal(entries[0]?.type, "Hotfix");
    assert.equal(entries[0]?.newest, true);
    assert.equal(entries[0]?.version, "43.0.8");
    assert.equal(entries[2]?.type, "Update");
    assert.equal(
      entries[2]?.url,
      "https://www.warframe.com/en/patch-notes/pc/43-0-0",
    );
  });
});

describe("computeNewEntries", () => {
  it("detects newly listed patch notes", () => {
    const previous = parsePatchNotesHtml(SAMPLE_HTML).slice(1);
    const current = parsePatchNotesHtml(SAMPLE_HTML);
    const { newEntries, removedIds } = computeNewEntries(previous, current);
    assert.deepEqual(
      newEntries.map((e) => e.id),
      ["43-0-8"],
    );
    assert.deepEqual(removedIds, []);
  });
});
