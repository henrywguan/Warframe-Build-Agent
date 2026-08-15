import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const stageTsx = readFileSync(join(here, "OrdisStage.tsx"), "utf8");
const stageCss = readFileSync(join(here, "OrdisStage.module.css"), "utf8");
const publicOrdis = join(here, "../../public/ordis");

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

  it("reserves a fixed caption row so status text is not clipped", () => {
    assert.match(stageCss, /--caption-slot/);
    assert.match(stageCss, /grid-template-rows:\s*minmax\(0,\s*1fr\)\s+var\(--caption-slot\)/);
    assert.match(stageCss, /height:\s*var\(--caption-slot\)/);
  });

  it("plays the transmit pop on the header stage, not over chat messages", () => {
    assert.match(stageCss, /transmitPop/);
    assert.match(stageCss, /\.speaking\s+\.field/);
  });

  it("wires mood WebP plates with SVG fallback", () => {
    assert.match(stageTsx, /data-assets=\{usePlate \? "plate" : "svg"\}/);
    assert.match(stageTsx, /\/ordis\/hero-idle\.webp/);
    assert.match(stageTsx, /\/ordis\/hero-thinking\.webp/);
    assert.match(stageTsx, /\/ordis\/hero-speaking\.webp/);
    assert.match(stageTsx, /\/ordis\/glow-plate\.webp/);
    assert.match(stageTsx, /\/ordis\/ring-think\.webp/);
    assert.match(stageTsx, /onError=\{\(\) => setUsePlate\(false\)\}/);
    assert.match(stageCss, /@container/);
    assert.match(stageCss, /ringSpin|glowPulse|ringPulseSpeak/);
  });

  it("ships the public ordis asset pack", () => {
    for (const name of [
      "hero-idle.webp",
      "hero-thinking.webp",
      "hero-speaking.webp",
      "glow-plate.webp",
      "ring-idle.webp",
      "ring-think.webp",
      "ring-speak.webp",
    ]) {
      assert.ok(existsSync(join(publicOrdis, name)), `missing ${name}`);
    }
  });
});
