import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const bar = readFileSync(join(here, "DesktopTaskbar.tsx"), "utf8");
const css = readFileSync(join(here, "DesktopTaskbar.module.css"), "utf8");

describe("DesktopTaskbar", () => {
  it("ships a left desktop dock with expanding labels and minimized pips", () => {
    assert.match(bar, /Desktop taskbar/);
    assert.match(bar, /Restore \$\{app\.title\}/);
    assert.match(bar, /Transmissions|title: "Transmissions"|app\.title/);
    assert.match(bar, /wfm: WfmIcon/);
    assert.match(bar, /itemMinimized/);
    assert.match(css, /min-width:\s*861px/);
    assert.match(css, /flex-direction:\s*column/);
    assert.match(css, /itemSelected/);
    assert.match(css, /itemSignal/);
    assert.match(css, /max-height:\s*2\.4rem/);
    assert.match(css, /overflow-wrap:\s*break-word/);
    assert.doesNotMatch(css, /max-width:\s*8\.5rem/);
    assert.doesNotMatch(css, /padding-right:\s*0\.75rem/);
    assert.match(css, /prefers-reduced-motion/);
    assert.doesNotMatch(css, /#1F9CFE/);
    assert.ok(existsSync(join(here, "DesktopTaskbar.module.css")));
  });
});
