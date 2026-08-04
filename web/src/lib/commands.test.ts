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
    assert.match(result.content, /\/market/);
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

  it("returns market usage when slug missing", async () => {
    const result = await runSlashCommand("/market");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Usage: \/market/);
    assert.deepEqual(result.toolsUsed, []);
  });

  it("handles unknown commands with the catalog", async () => {
    const result = await runSlashCommand("/nope");
    assert.equal(result.handled, true);
    if (!result.handled) return;
    assert.match(result.content, /Unknown command/);
    assert.match(result.content, /Warframe Build Agent — commands/);
    assert.equal(result.content.includes(formatCommandList()), true);
  });
});
