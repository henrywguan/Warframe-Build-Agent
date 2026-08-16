import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("ReplyLoader", () => {
  it("renders the Uiverse-style bar loader with accessible status label", () => {
    const source = readFileSync(join(here, "ReplyLoader.tsx"), "utf8");
    assert.match(source, /role="status"/);
    assert.match(source, /aria-live="polite"/);
    assert.match(source, /styles\.bar/);
    assert.match(source, /silent-lion-21/);
  });

  it("uses arsenal glow styling and reduced-motion fallback", () => {
    const css = readFileSync(join(here, "ReplyLoader.module.css"), "utf8");
    assert.match(css, /scalePulse/);
    assert.match(css, /drop-shadow/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /--cyan|#7fe7ef/);
  });
});
