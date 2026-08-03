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
