import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCommandList,
  isSlashCommand,
  runSlashCommand,
} from "./commands.ts";

describe("slash commands", () => {
  it("detects slash commands", () => {
    assert.equal(isSlashCommand("/list"), true);
    assert.equal(isSlashCommand("  /patches"), true);
    assert.equal(isSlashCommand("list"), false);
  });

  it("lists commands without calling tools", async () => {
    const result = await runSlashCommand("/list");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /\/list/);
    assert.match(result.content, /\/patches/);
    assert.match(result.content, /\/patch /);
    assert.match(result.content, /\/model/);
    assert.match(result.content, /\/market/);
    assert.match(result.content, /\/wfm/);
    assert.match(result.content, /\/baro/);
    assert.match(result.content, /\/build/);
    assert.match(result.content, /\/farm/);
    assert.match(result.content, /\/slug/);
    assert.match(result.content, /\/cleanup-simplify/);
    assert.match(result.content, /\/cleanup-simplify -all/);
    assert.match(result.content, /\/knowledge/);
    assert.match(result.content, /docs\/commands\.md/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("returns build usage when item missing", async () => {
    const result = await runSlashCommand("/build");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/build/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("returns farm usage when item missing", async () => {
    const result = await runSlashCommand("/farm");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/farm/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("returns slug usage when query missing", async () => {
    const result = await runSlashCommand("/slug");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/slug/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("returns duviri stub without tools", async () => {
    const result = await runSlashCommand("/circuit");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Circuit/i);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("routes /patch to detail tool", async () => {
    const result = await runSlashCommand("/patch 43.0.8");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.deepEqual(result.toolsUsed, ["get_patch_notes_detail"]);
  });

  it("returns market usage when slug missing", async () => {
    const result = await runSlashCommand("/market");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/market/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("returns wfm usage when query missing", async () => {
    const result = await runSlashCommand("/wfm");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/wfm/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("registers /warframe-market as a /wfm alias", async () => {
    const result = await runSlashCommand("/warframe-market");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/wfm/);
  });

  it("handles unknown commands with the catalog", async () => {
    const result = await runSlashCommand("/nope");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Unknown command/);
    assert.match(result.content, /Warframe Build Agent — commands/);
    assert.equal(result.content.includes(formatCommandList()), true);
  });

  it("handles /arbitration via live tool", async () => {
    const result = await runSlashCommand("/arbitration");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.deepEqual(result.toolsUsed, ["get_arbitration"]);
  });

  it("returns ehp usage when args missing", async () => {
    const result = await runSlashCommand("/ehp");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/ehp|--health/);
    assert.deepEqual(result.toolsUsed, ["estimate_ehp"]);
  });

  it("returns relic usage when query missing", async () => {
    const result = await runSlashCommand("/relic");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/relic/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("returns explain usage when topic missing", async () => {
    const result = await runSlashCommand("/explain");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/explain/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("returns optimize stub for a mode", async () => {
    const result = await runSlashCommand("/optimize sp");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Steel Path/i);
    assert.match(result.content, /stub/i);
    assert.deepEqual(result.toolsUsed, []);
  });
});
