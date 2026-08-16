import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pane = readFileSync(join(here, "SavedBuildsPane.tsx"), "utf8");
const css = readFileSync(join(here, "SavedBuildsPane.module.css"), "utf8");

describe("SavedBuildsPane", () => {
  it("ships plus/minus controls and scrollable cards", () => {
    assert.match(pane, /Add build slot/);
    assert.match(pane, /Remove selected build/);
    assert.match(pane, /Saved Builds/);
    assert.match(pane, /Archon crystals/);
    assert.match(pane, /onDoubleClick/);
    assert.match(css, /\.scroll/);
    assert.match(css, /min-width:\s*861px/);
    assert.ok(existsSync(join(here, "SavedBuildsPane.module.css")));
  });
});
