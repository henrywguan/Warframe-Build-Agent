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
    assert.match(pane, /addMenu/);
    assert.match(pane, /addTrigger/);
    assert.match(pane, /Add slot/);
    assert.match(pane, /Warframe, Primary, Secondary, Melee, or Companion/);
    assert.match(pane, /NameSuggestInput/);
    assert.match(pane, /offline-suggest/);
    assert.match(pane, /Remove selected build/);
    assert.match(pane, /Saved Builds/);
    assert.match(pane, /Archon crystals/);
    assert.match(pane, /onDoubleClick/);
    assert.match(css, /\.addMenu/);
    assert.match(css, /\.addTrigger/);
    assert.match(css, /\.addLegend/);
    assert.match(css, /old-falcon-43/);
    assert.match(css, /\.slotHeading/);
    assert.match(css, /min-width:\s*861px/);
    assert.ok(existsSync(join(here, "SavedBuildsPane.module.css")));
  });

  it("morphs the plus trigger and respects reduced motion", () => {
    assert.match(pane, /data-open=\{addOpen/);
    assert.match(pane, /SlotGlyph/);
    assert.match(pane, /ADD_MENU_GROUPS/);
    assert.match(css, /data-open="true"/);
    assert.match(css, /rotate\(45deg\)/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /--cyan|#7fe7ef/);
    assert.match(css, /--gold|#d7b56d/);
  });

  it("supports a mobile overlay drawer like chat history", () => {
    assert.match(pane, /mobileOpen/);
    assert.match(pane, /onMobileClose/);
    assert.match(pane, /Close saved builds/);
    assert.match(css, /\.backdrop/);
    assert.match(css, /\.paneOpen/);
    assert.match(css, /max-width:\s*860px/);
  });

  it("adds desktop minimize and resize chrome", () => {
    assert.match(pane, /Minimize saved builds/);
    assert.match(pane, /PanelResizeHandles/);
    assert.match(pane, /desktopHidden/);
    assert.match(css, /\.chromeBtn/);
    assert.match(css, /\.railHidden/);
  });
});
