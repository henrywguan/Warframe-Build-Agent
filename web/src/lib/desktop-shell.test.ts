import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_DESKTOP_SHELL,
  clampPanelHeight,
  clampPanelWidth,
  desktopWorkspaceColumns,
  parseDesktopShell,
} from "./desktop-shell.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pageCss = readFileSync(join(here, "../app/page.module.css"), "utf8");

describe("desktop shell layout", () => {
  it("clamps panel width and height", () => {
    assert.equal(clampPanelWidth(40, 200), 200);
    assert.equal(clampPanelWidth(900, 200), 440);
    assert.equal(clampPanelHeight(80, 800), 220);
    assert.equal(clampPanelHeight(9000, 800), 776);
  });

  it("parses persisted shell JSON with fallbacks", () => {
    const parsed = parseDesktopShell({
      history: { w: 300, h: 400, minimized: true },
      builds: { w: "nope", minimized: false },
    });
    assert.equal(parsed.history.w, 300);
    assert.equal(parsed.history.h, 400);
    assert.equal(parsed.history.minimized, true);
    assert.equal(parsed.builds.w, DEFAULT_DESKTOP_SHELL.builds.w);
    assert.equal(parsed.builds.minimized, false);
  });

  it("drops minimized columns from the desktop grid", () => {
    const both = desktopWorkspaceColumns(DEFAULT_DESKTOP_SHELL);
    assert.match(both, /3\.5rem/);
    assert.match(both, /248px/);
    assert.match(both, /304px/);

    const collapsed = desktopWorkspaceColumns({
      history: { ...DEFAULT_DESKTOP_SHELL.history, minimized: true },
      builds: { ...DEFAULT_DESKTOP_SHELL.builds, minimized: true },
    });
    assert.equal(collapsed, "3.5rem minmax(0, 1fr)");
  });

  it("pins the desktop workspace to the viewport left with extra center gap", () => {
    assert.match(pageCss, /width:\s*100%/);
    assert.match(pageCss, /max-width:\s*none/);
    assert.match(pageCss, /column-gap:\s*1\.35rem/);
    assert.match(pageCss, /max-width:\s*54rem/);
    assert.match(pageCss, /\.chatPanel \.statusLine/);
  });
});
