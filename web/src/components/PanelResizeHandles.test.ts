import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const handles = readFileSync(join(here, "PanelResizeHandles.tsx"), "utf8");
const css = readFileSync(join(here, "PanelResizeHandles.module.css"), "utf8");

describe("PanelResizeHandles", () => {
  it("exposes east/west/corner pointer handles for desktop panels", () => {
    assert.match(handles, /east/);
    assert.match(handles, /west/);
    assert.match(handles, /corner/);
    assert.match(handles, /onPointerDown/);
    assert.match(css, /ew-resize/);
    assert.match(css, /nwse-resize/);
    assert.match(css, /max-width:\s*860px/);
  });
});
