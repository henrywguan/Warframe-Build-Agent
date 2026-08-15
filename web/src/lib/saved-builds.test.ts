import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addFolder,
  applySaveBuildCommand,
  createEmptyBuild,
  emptySavedBuilds,
  isSaveBuildSlash,
  parseSaveBuildArgs,
  renameBuild,
  renameFolder,
  stripSaveBuildCommand,
} from "./saved-builds.ts";

describe("saved-builds", () => {
  it("detects /save-build slash forms", () => {
    assert.equal(isSaveBuildSlash("/save-build"), true);
    assert.equal(isSaveBuildSlash("/savebuild help"), true);
    assert.equal(isSaveBuildSlash("/arsenal-save SP"), true);
    assert.equal(isSaveBuildSlash("/build Rhino"), false);
    assert.equal(stripSaveBuildCommand("/save-build Hello"), "Hello");
  });

  it("parses keyed loadout fields into a card", () => {
    const build = parseSaveBuildArgs(
      "SP Nourish | warframe: Rhino Prime | primary: Coda Hema | companion: Carrier | crystals: Crimson Primary Damage, Amber Casting Speed | primary-mods: Serration, Vital Sense | primary-arcanes: Primary Merciless",
    );
    assert.equal(build.name, "SP Nourish");
    assert.equal(build.warframe.name, "Rhino Prime");
    assert.equal(build.primary.name, "Coda Hema");
    assert.deepEqual(build.primary.mods, ["Serration", "Vital Sense"]);
    assert.deepEqual(build.primary.arcanes, ["Primary Merciless"]);
    assert.equal(build.companion.name, "Carrier");
    assert.equal(build.archonCrystals.length, 2);
    assert.equal(build.archonCrystals[0]?.color, "Crimson");
  });

  it("applies save command with folder creation", () => {
    const result = applySaveBuildCommand(
      emptySavedBuilds(),
      "Test | warframe: Mag | folder: Steel Path",
    );
    assert.equal(result.memory.folders.length, 1);
    assert.equal(result.memory.folders[0]?.name, "Steel Path");
    assert.equal(result.build.folderId, result.memory.folders[0]?.id);
    assert.match(result.reply, /Saved build/);
  });

  it("renames builds and folders", () => {
    let memory = emptySavedBuilds();
    memory = addFolder(memory, "Old");
    const folderId = memory.folders[0]!.id;
    const build = createEmptyBuild({ name: "A", folderId });
    memory = { ...memory, builds: [build] };
    memory = renameFolder(memory, folderId, "New folder");
    memory = renameBuild(memory, build.id, "Renamed");
    assert.equal(memory.folders[0]?.name, "New folder");
    assert.equal(memory.builds[0]?.name, "Renamed");
  });
});
