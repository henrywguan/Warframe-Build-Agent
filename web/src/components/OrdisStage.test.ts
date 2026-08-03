import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const stageTsx = readFileSync(join(here, "OrdisStage.tsx"), "utf8");
const stageCss = readFileSync(join(here, "OrdisStage.module.css"), "utf8");

describe("OrdisStage talking animation wiring", () => {
  it("binds data-mood for idle/thinking/speaking states", () => {
    assert.match(stageTsx, /data-mood=\{mood\}/);
    assert.match(stageTsx, /aria-label="Ordis cephalon"/);
    assert.match(stageCss, /\.speaking\s/);
    assert.match(stageCss, /speechRipple|speakBob|arcPulse/);
    assert.match(stageCss, /\.thinking\s/);
  });

  it("uses shared Ordis mood type from lib/ordis", () => {
    assert.match(stageTsx, /from ["']\.\.\/lib\/ordis["']/);
  });
});
