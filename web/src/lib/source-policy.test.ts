import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  LOCAL_KNOWLEDGE_TOOL_DESCRIPTION,
  ONLINE_SEARCH_CONFIRMATION_MARKER,
  SOURCE_POLICY,
  conversationAllowsOnlineBuildSearch,
  formatOnlineSearchConfirmation,
  looksLikeBuildRequest,
  parseOnlineSearchConsent,
} from "./source-policy.ts";
import { SYSTEM_PROMPT } from "./system-prompt.ts";
import { chatTools } from "./tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");

describe("web source policy (local first + online confirmation)", () => {
  it("requires local lookup first and confirmation before online search", () => {
    assert.match(SYSTEM_PROMPT, /Source policy/);
    assert.match(SYSTEM_PROMPT, /lookup_local_knowledge/);
    assert.match(SYSTEM_PROMPT, /ONLINE_SEARCH_CONFIRMATION_REQUIRED/);
    assert.match(SYSTEM_PROMPT, /ask the player for confirmation/);
    assert.match(SOURCE_POLICY, /Always call/);
    assert.match(SOURCE_POLICY, /explicit \*\*yes\*\*/);
    assert.ok(SYSTEM_PROMPT.includes(SOURCE_POLICY));
  });

  it("tool description mentions confirmation gate", () => {
    assert.match(LOCAL_KNOWLEDGE_TOOL_DESCRIPTION, /ONLINE_SEARCH_CONFIRMATION_REQUIRED/);
    const tool = chatTools.find(
      (entry) => entry.type === "function" && entry.function.name === "lookup_local_knowledge",
    );
    assert.ok(tool && tool.type === "function");
    assert.equal(tool.function.description, LOCAL_KNOWLEDGE_TOOL_DESCRIPTION);
  });

  it("formats a yes/no online search confirmation", () => {
    const text = formatOnlineSearchConfirmation(["Coda Hema"]);
    assert.match(text, new RegExp(ONLINE_SEARCH_CONFIRMATION_MARKER));
    assert.match(text, /Coda Hema/);
    assert.match(text, /Reply \*\*yes\*\*/);
    assert.match(text, /Overframe, YouTube/);
  });

  it("detects build requests and yes/no consent", () => {
    assert.equal(looksLikeBuildRequest("best build for Coda Hema?"), true);
    assert.equal(looksLikeBuildRequest("what time is cetus night?"), false);
    assert.equal(parseOnlineSearchConsent("yes"), "yes");
    assert.equal(parseOnlineSearchConsent("search online"), "yes");
    assert.equal(parseOnlineSearchConsent("no"), "no");
    assert.equal(parseOnlineSearchConsent("stay local"), "no");
    assert.equal(parseOnlineSearchConsent("maybe later"), null);
    assert.equal(
      conversationAllowsOnlineBuildSearch([
        { role: "assistant", content: formatOnlineSearchConfirmation(["X"]) },
        { role: "user", content: "yes" },
      ]),
      true,
    );
    assert.equal(
      conversationAllowsOnlineBuildSearch([
        { role: "user", content: "yes" },
        { role: "user", content: "no thanks, stay local" },
      ]),
      false,
    );
  });

  it("documents the confirmation policy", () => {
    const doc = readFileSync(join(repoRoot, "docs/source-policy.md"), "utf8");
    assert.match(doc, /Local database first/);
    assert.match(doc, /ONLINE_SEARCH_CONFIRMATION_REQUIRED/);
    assert.match(doc, /explicit yes/i);
    assert.match(doc, /Web chat/);
    assert.match(doc, /Overlay/);
  });
});
