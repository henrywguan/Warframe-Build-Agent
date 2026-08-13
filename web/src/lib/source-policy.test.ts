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
  formatOnlineSearchConfirmation,
  looksLikeBuildRequest,
} from "./source-policy.ts";
import { SYSTEM_PROMPT } from "./system-prompt.ts";
import { chatTools } from "./tools.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");

describe("web source policy (local first + online toggle)", () => {
  it("requires local lookup first and Online search toggle (no yes/no)", () => {
    assert.match(SYSTEM_PROMPT, /Source policy/);
    assert.match(SYSTEM_PROMPT, /lookup_local_knowledge/);
    assert.match(SYSTEM_PROMPT, /ONLINE_SEARCH_CONFIRMATION_REQUIRED/);
    assert.match(SYSTEM_PROMPT, /Never ask the player to type \*\*yes\*\*/);
    assert.doesNotMatch(SYSTEM_PROMPT, /ask yes\/no before Overframe/);
    assert.match(SOURCE_POLICY, /Always call/);
    assert.match(SOURCE_POLICY, /Online search toggle ON/);
    assert.doesNotMatch(SOURCE_POLICY, /Reply \*\*yes\*\*/);
    assert.ok(SYSTEM_PROMPT.includes(SOURCE_POLICY));
  });

  it("tool description mentions Online search toggle gate", () => {
    assert.match(LOCAL_KNOWLEDGE_TOOL_DESCRIPTION, /ONLINE_SEARCH_CONFIRMATION_REQUIRED/);
    assert.match(LOCAL_KNOWLEDGE_TOOL_DESCRIPTION, /do not ask yes\/no/i);
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
    assert.ok(!names.includes("fetch_web_page"));
  });

  it("adds search_community_builds when online search is enabled", async () => {
    const { getChatTools, runChatTool } = await import("./tools.ts");
    const names = getChatTools({ onlineSearch: true })
      .filter((entry) => entry.type === "function")
      .map((entry) => entry.function.name);
    assert.ok(names.includes("search_community_builds"));
    assert.ok(names.includes("fetch_web_page"));
    assert.ok(!names.includes("search_web"));
    const disabled = await runChatTool(
      "search_community_builds",
      JSON.stringify({ query: "Coda Hema" }),
      { onlineSearch: false },
    );
    assert.match(disabled, /ONLINE_SEARCH_DISABLED/);
    assert.match(disabled, /Do not ask them to type yes\/no/);
  });

  it("adds search_web and fetch_web_page when LLM mode is enabled", async () => {
    const { getChatTools, runChatTool } = await import("./tools.ts");
    const names = getChatTools({ llmMode: true })
      .filter((entry) => entry.type === "function")
      .map((entry) => entry.function.name);
    assert.ok(names.includes("search_web"));
    assert.ok(names.includes("fetch_web_page"));
    assert.ok(!names.includes("search_community_builds"));
    const disabled = await runChatTool(
      "search_web",
      JSON.stringify({ query: "Excalibur steel path" }),
      { llmMode: false },
    );
    assert.match(disabled, /LLM_MODE_DISABLED/);
    const fetchDisabled = await runChatTool(
      "fetch_web_page",
      JSON.stringify({ url: "https://wiki.warframe.com/w/Mesa" }),
      { llmMode: false, onlineSearch: false },
    );
    assert.match(fetchDisabled, /FETCH_PAGE_DISABLED/);
    const both = getChatTools({ llmMode: true, onlineSearch: true }).map(
      (entry) => (entry.type === "function" ? entry.function.name : ""),
    );
    assert.ok(both.includes("search_web"));
    assert.ok(both.includes("search_community_builds"));
    assert.ok(both.includes("fetch_web_page"));
  });

  it("Online search still gates only search_community_builds (not search_web)", async () => {
    const { getChatTools } = await import("./tools.ts");
    const onlineOnly = getChatTools({ onlineSearch: true, llmMode: false }).map(
      (entry) => (entry.type === "function" ? entry.function.name : ""),
    );
    assert.ok(onlineOnly.includes("search_community_builds"));
    assert.ok(onlineOnly.includes("fetch_web_page"));
    assert.ok(!onlineOnly.includes("search_web"));
    const llmOnly = getChatTools({ llmMode: true, onlineSearch: false }).map(
      (entry) => (entry.type === "function" ? entry.function.name : ""),
    );
    assert.ok(llmOnly.includes("search_web"));
    assert.ok(!llmOnly.includes("search_community_builds"));
  });

  it("AI-on prompt is general agent; AI-off keeps Warframe prompt", async () => {
    const { GENERAL_AGENT_PROMPT } = await import("./general-agent-prompt.ts");
    assert.match(GENERAL_AGENT_PROMPT, /General agent is ON/i);
    assert.match(GENERAL_AGENT_PROMPT, /Do \*\*not\*\* force Warframe framing/);
    assert.match(GENERAL_AGENT_PROMPT, /search_web/);
    assert.match(GENERAL_AGENT_PROMPT, /Hermes Desktop/);
    assert.match(SYSTEM_PROMPT, /Warframe Build Agent/);
    assert.doesNotMatch(SYSTEM_PROMPT, /General agent is ON/i);
  });

  it("formats a toggle-gated online search marker (no Reply yes)", () => {
    const text = formatOnlineSearchConfirmation(["Coda Hema"]);
    assert.match(text, new RegExp(ONLINE_SEARCH_CONFIRMATION_MARKER));
    assert.match(text, /Coda Hema/);
    assert.doesNotMatch(text, /Reply \*\*yes\*\*/);
    assert.match(text, /Online search/);
    assert.match(text, /do not ask the player to type yes\/no/i);
  });

  it("detects build requests; Online search annotate is toggle-gated", () => {
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
    const annotated = annotateToolResultForOnlineConsent(
      formatOnlineSearchConfirmation(["Coda Hema"]),
      true,
    );
    assert.match(annotated, /ONLINE_SEARCH_ALLOWED/);
    assert.match(annotated, /search_community_builds/);
    assert.match(annotated, /Do NOT ask the player to type yes\/no/);
    assert.equal(
      annotateToolResultForOnlineConsent(
        formatOnlineSearchConfirmation(["Coda Hema"]),
        false,
      ),
      formatOnlineSearchConfirmation(["Coda Hema"]),
    );
  });

  it("documents the Online search toggle policy", () => {
    const doc = readFileSync(join(repoRoot, "docs/source-policy.md"), "utf8");
    assert.match(doc, /Local knowledge pack first/);
    assert.match(doc, /ONLINE_SEARCH_CONFIRMATION_REQUIRED/);
    assert.match(doc, /Online search toggle ON/i);
    assert.match(doc, /never ask the player to type/i);
    assert.match(doc, /fetch_web_page/);
    assert.match(doc, /search_community_builds/);
    assert.match(doc, /Web chat/);
    assert.match(doc, /Overlay/);
    assert.match(doc, /estimate_modded_dps/);
    assert.match(doc, /mechanics|arcanes/i);
  });
});
