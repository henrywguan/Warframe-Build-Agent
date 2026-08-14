import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("VoidField module", () => {
  it("exports a client Three.js atmosphere wired to Ordis moods", () => {
    const source = readFileSync(join(here, "VoidField.tsx"), "utf8");
    assert.match(source, /THREE\.Timer/);
    assert.match(source, /timer\.getElapsed\(\)/);
    assert.doesNotMatch(source, /THREE\.Clock/);
    assert.match(source, /OrdisMood/);
    assert.match(source, /prefers-reduced-motion/);
    assert.match(source, /visibilitychange/);
    assert.match(source, /OctahedronGeometry/);
    assert.match(source, /0x7fe7ef/);
    assert.match(source, /0xd7b56d/);
    assert.match(source, /0xe08a5a/);
    assert.match(source, /0x6edc9a/);
    assert.match(source, /data-mood=\{mood\}/);
    assert.match(source, /Left \/ right void lights surge with Ordis replies/);
    assert.match(source, /CRYSTAL_LAYOUTS/);
    assert.match(source, /280/);
    assert.match(source, /edgeBias/);
  });
});
