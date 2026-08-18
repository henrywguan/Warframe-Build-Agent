import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pane = readFileSync(join(here, "ChatHistorySidebar.tsx"), "utf8");
const css = readFileSync(join(here, "ChatHistorySidebar.module.css"), "utf8");

describe("ChatHistorySidebar", () => {
  it("supports desktop minimize and resize without dropping mobile close", () => {
    assert.match(pane, /Minimize transmissions/);
    assert.match(pane, /PanelResizeHandles/);
    assert.match(pane, /desktopHidden/);
    assert.match(pane, /Close chat list/);
    assert.match(css, /\.chromeBtn/);
    assert.match(css, /\.railHidden/);
  });
});
