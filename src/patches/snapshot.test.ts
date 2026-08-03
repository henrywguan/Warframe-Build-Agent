import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { PatchNotesClient } from "./client.js";
import { isDailyPullWindow, runDailyPatchCheck } from "./snapshot.js";

const DAY1 = `
<li><a href="https://www.warframe.com/en/patch-notes/pc/43-0-7">Mesa Heirloom: Hotfix 43.0.7</a></li>
<li><a href="https://www.warframe.com/en/patch-notes/pc/43-0-0">Update 43: Jade Shadows: Constellations</a></li>
`;

const DAY2 = `
<li><span class="tag"><span class="label">Newest</span></span>
<a href="https://www.warframe.com/en/patch-notes/pc/43-0-8">Mesa Heirloom: Hotfix 43.0.8</a></li>
${DAY1}
`;

describe("isDailyPullWindow", () => {
  it("detects 4pm Pacific", () => {
    assert.equal(isDailyPullWindow(new Date("2026-08-02T23:05:00.000Z")), true);
    assert.equal(isDailyPullWindow(new Date("2026-08-02T20:05:00.000Z")), false);
  });
});

describe("runDailyPatchCheck", () => {
  it("writes snapshot and highlights newly listed hotfixes", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "wf-patches-"));
    let html = DAY1;
    const fetchImpl: typeof fetch = async () =>
      new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    const client = new PatchNotesClient({ fetchImpl });

    const first = await runDailyPatchCheck({
      dataDir: tmp,
      client,
      now: new Date("2026-08-01T23:00:00.000Z"),
      requirePullWindow: false,
    });
    assert.ok(first.snapshot);
    assert.equal(first.changes, null);

    html = DAY2;
    const second = await runDailyPatchCheck({
      dataDir: tmp,
      client,
      now: new Date("2026-08-02T23:00:00.000Z"),
      requirePullWindow: false,
    });
    assert.ok(second.changes);
    assert.equal(second.changes.newEntries[0]?.id, "43-0-8");
    assert.equal(second.changes.latest?.newest, true);

    const latest = JSON.parse(
      await readFile(path.join(tmp, "latest-changes.json"), "utf8"),
    );
    assert.equal(latest.newEntries[0].title.includes("43.0.8"), true);

    await rm(tmp, { recursive: true, force: true });
  });
});
