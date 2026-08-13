import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "OrdisTransmitOverlay.tsx"), "utf8");
const css = readFileSync(join(here, "OrdisTransmitOverlay.module.css"), "utf8");

describe("OrdisTransmitOverlay", () => {
  it("mounts a holographic speak pop using the shared Ordis stage", () => {
    assert.match(source, /OrdisStage/);
    assert.match(source, /size="hero"/);
    assert.match(source, /SPEAKING_MS/);
    assert.match(source, /active/);
  });

  it("defines glitchy fade/pop motion keyed to the speaking window", () => {
    assert.match(css, /hologramPop/);
    assert.match(css, /glitchSliceA|glitchSliceB/);
    assert.match(css, /corePulse|eyeRingIn/);
    assert.match(css, /--speak-ms/);
    assert.match(css, /prefers-reduced-motion/);
  });
});
