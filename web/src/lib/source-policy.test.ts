import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  LOCAL_KNOWLEDGE_TOOL_DESCRIPTION,
  ONLINE_SEARCH_CONFIRMATION_MARKER,
  SOURCE_POLICY,
  annotateToolResultForOnlineConsent,
  conversationAllowsOnlineBuildSearch,
  formatOnlineSearchConfirmation,
  looksLikeBuildRequest,
  parseOnlineSearchConsent,
  resolveOnlineBuildSearchAllowed,
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
    assert.match(LOCAL_KNOWLEDGE_TOOL_DESCRIPTION, /mechanics|Arcane/i);
    const tool = chatTools.find(
      (entry) => entry.type === "function" && entry.function.name === "lookup_local_knowledge",
    );
    assert.ok(tool && tool.type === "function");
    assert.equal(tool.function.description, LOCAL_KNOWLEDGE_TOOL_DESCRIPTION);
  });

  it("registers offline compare and dps tools", () => {
    const names = chatTools
      .filter((entry) => entry.type === "function")
      .map((entry) => entry.function.name);
    assert.ok(names.includes("compare_loadout_to_overframe"));
    assert.ok(names.includes("estimate_modded_dps"));
    assert.ok(names.includes("lookup_local_knowledge"));
    assert.ok(!names.includes("search_community_builds"));
  });

  it("adds search_community_builds when online search is enabled", async () => {
    const { getChatTools, runChatTool } = await import("./tools.ts");
    const names = getChatTools({ onlineSearch: true })
      .filter((entry) => entry.type === "function")
      .map((entry) => entry.function.name);
    assert.ok(names.includes("search_community_builds"));
    assert.ok(!names.includes("search_web"));
    const disabled = await runChatTool(
      "search_community_builds",
      JSON.stringify({ query: "Coda Hema" }),
      { onlineSearch: false },
    );
    assert.match(disabled, /ONLINE_SEARCH_DISABLED/);
  });

  it("adds search_web when AI chat is enabled", async () => {
    const { getChatTools, runChatTool } = await import("./tools.ts");
    const names = getChatTools({ aiChat: true })
      .filter((entry) => entry.type === "function")
      .map((entry) => entry.function.name);
    assert.ok(names.includes("search_web"));
    assert.ok(!names.includes("search_community_builds"));
    const disabled = await runChatTool(
      "search_web",
      JSON.stringify({ query: "Excalibur steel path" }),
      { aiChat: false },
    );
    assert.match(disabled, /AI_CHAT_DISABLED/);
    const both = getChatTools({ aiChat: true, onlineSearch: true }).map(
      (entry) => (entry.type === "function" ? entry.function.name : ""),
    );
    assert.ok(both.includes("search_web"));
    assert.ok(both.includes("search_community_builds"));
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
    assert.equal(
      looksLikeBuildRequest("maximum damage build for Enkaus"),
      true,
    );
    assert.equal(
      looksLikeBuildRequest("crawl the web for steel path Enkaus"),
      true,
    );
    assert.equal(looksLikeBuildRequest("what time is cetus night?"), false);
    assert.equal(parseOnlineSearchConsent("yes"), "yes");
    assert.equal(parseOnlineSearchConsent("crawl the web"), "yes");
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
    assert.equal(
      resolveOnlineBuildSearchAllowed({
        messages: [{ role: "user", content: "best build for X?" }],
        uiToggle: true,
      }),
      true,
    );
    assert.equal(
      resolveOnlineBuildSearchAllowed({
        messages: [{ role: "user", content: "best build for X?" }],
        uiToggle: false,
      }),
      false,
    );
    assert.equal(
      resolveOnlineBuildSearchAllowed({
        messages: [
          { role: "assistant", content: formatOnlineSearchConfirmation(["X"]) },
          { role: "user", content: "yes" },
        ],
        uiToggle: false,
      }),
      true,
    );
    const annotated = annotateToolResultForOnlineConsent(
      formatOnlineSearchConfirmation(["Coda Hema"]),
      true,
    );
    assert.match(annotated, /ONLINE_SEARCH_ALLOWED/);
    assert.match(annotated, /search_community_builds/);
    assert.match(annotated, /Do NOT ask yes\/no/);
    assert.equal(
      annotateToolResultForOnlineConsent(
        formatOnlineSearchConfirmation(["Coda Hema"]),
        false,
      ),
      formatOnlineSearchConfirmation(["Coda Hema"]),
    );
  });

  it("documents the confirmation policy", () => {
    const doc = readFileSync(join(repoRoot, "docs/source-policy.md"), "utf8");
    assert.match(doc, /Local knowledge pack first/);
    assert.match(doc, /ONLINE_SEARCH_CONFIRMATION_REQUIRED/);
    assert.match(doc, /explicit yes/i);
    assert.match(doc, /search_community_builds/);
    assert.match(doc, /Web chat/);
    assert.match(doc, /Overlay/);
    assert.match(doc, /estimate_modded_dps/);
    assert.match(doc, /mechanics|arcanes/i);
  });
});
