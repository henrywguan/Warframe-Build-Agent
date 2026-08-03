import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  LOCAL_KNOWLEDGE_TOOL_DESCRIPTION,
  SOURCE_POLICY,
} from "./source-policy.ts";
import { SYSTEM_PROMPT } from "./system-prompt.ts";
import { chatTools } from "./tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");

describe("web source policy (offline facts / Overframe·YouTube·agent builds)", () => {
  it("encodes offline-default and build-source priority in the system prompt", () => {
    assert.match(SYSTEM_PROMPT, /Source policy/);
    assert.match(SYSTEM_PROMPT, /lookup_local_knowledge/);
    assert.match(SYSTEM_PROMPT, /Do not browse the live web/);
    assert.match(SYSTEM_PROMPT, /Overframe/);
    assert.match(SYSTEM_PROMPT, /YouTube/);
    assert.match(SYSTEM_PROMPT, /agent-calculated/);
    assert.ok(SYSTEM_PROMPT.includes(SOURCE_POLICY));
  });

  it("describes local knowledge as facts-first with Overframe cache for builds", () => {
    assert.match(LOCAL_KNOWLEDGE_TOOL_DESCRIPTION, /offline Warframe facts/);
    assert.match(LOCAL_KNOWLEDGE_TOOL_DESCRIPTION, /Overframe/);
    assert.doesNotMatch(
      LOCAL_KNOWLEDGE_TOOL_DESCRIPTION,
      /Prefer this for build recalls and item digests before inventing mods/,
    );

    const tool = chatTools.find(
      (entry) => entry.type === "function" && entry.function.name === "lookup_local_knowledge",
    );
    assert.ok(tool && tool.type === "function");
    assert.equal(tool.function.description, LOCAL_KNOWLEDGE_TOOL_DESCRIPTION);
  });

  it("documents the same policy for the repo", () => {
    const doc = readFileSync(join(repoRoot, "docs/source-policy.md"), "utf8");
    assert.match(doc, /Offline first for facts/);
    assert.match(doc, /Overframe/);
    assert.match(doc, /YouTube/);
    assert.match(doc, /Agent-calculated/);
    assert.match(doc, /Web chat/);
    assert.match(doc, /Overlay/);
  });
});
