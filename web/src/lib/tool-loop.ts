/** Max model→tools→model cycles before forcing a text answer (Warframe LLM advisor). */
export const MAX_TOOL_ROUNDS = 6;

/** Slightly higher budget for general-agent research (AI on). */
export const GENERAL_AGENT_MAX_TOOL_ROUNDS = 12;

export const TOOL_BUDGET_EXHAUSTED_PROMPT =
  "Tool budget exhausted. Using only the tool results already above, give your final player-facing answer now. Do not call any more tools.";

/** Community crawl is huge; one call per turn is enough even if the query string differs. */
const ONCE_PER_TURN_TOOLS = new Set(["search_community_builds"]);

/** Skip these while the Operator is saving/adding a personal build card. */
export const SAVE_BUILD_SKIP_RESEARCH_TOOLS = new Set([
  "search_community_builds",
  "lookup_local_knowledge",
  "search_web",
  "fetch_web_page",
  "compare_loadout_to_overframe",
]);

export const SKIPPED_FOR_SAVE_BUILD =
  "SKIPPED_FOR_SAVE_BUILD: the Operator is saving or adding a personal build card. Call save_build now with itemName + mods + arcanes + crystals from this conversation. Do not call search_community_builds, lookup_local_knowledge, or web search on this turn.";

/** Keep tool payloads small enough for local 8k-context models. */
export const TOOL_RESULT_CHAR_LIMIT = 2400;

export const CONTEXT_OVERFLOW_PLAYER_MESSAGE =
  "That request overflowed this local model's context window (often 8192 tokens). Turn **Online search** off when saving a card, start a new chat, or raise Ollama `num_ctx`. To add a build, say “save this as a card” in a shorter message so I can call `save_build` only.";

export function toolCallDedupeKey(name: string, rawArgs: string): string {
  if (ONCE_PER_TURN_TOOLS.has(name)) return name;
  return `${name}:${rawArgs.trim() || "{}"}`;
}

/**
 * Local models often re-call the same tool with the same args.
 * Return a stub result so the next turn can answer instead of looping.
 */
export function dedupeToolCall(
  seen: Set<string>,
  name: string,
  rawArgs: string,
): { duplicate: boolean; stub?: string } {
  const key = toolCallDedupeKey(name, rawArgs);
  if (seen.has(key)) {
    return {
      duplicate: true,
      stub: [
        "DUPLICATE_TOOL_CALL: you already ran this tool this turn.",
        "Do not call tools again. Answer the player using the earlier tool results in this conversation.",
        name === "search_community_builds"
          ? "search_community_builds may only run once per turn."
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }
  seen.add(key);
  return { duplicate: false };
}

export function clipToolResult(
  name: string,
  result: string,
  limit = TOOL_RESULT_CHAR_LIMIT,
): string {
  if (name === "save_build") return result;
  if (result.length <= limit) return result;
  const omitted = result.length - limit;
  return `${result.slice(0, limit)}\n\n[clipped ${omitted} chars from ${name} to fit context]`;
}

export function isContextOverflowError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /exceed_context_size|exceeds the available context|n_prompt_tokens|context length|context size|too many tokens|n_ctx/i.test(
    text,
  );
}

/**
 * Shrink string contents only — never drop or reorder tool_call / tool pairs.
 */
export function clipMessagesForContextRetry<T extends { role?: string; content?: unknown }>(
  messages: T[],
): T[] {
  return messages.map((m) => {
    if (typeof m.content !== "string") return m;
    if (m.role === "tool" && m.content.length > 900) {
      return { ...m, content: clipToolResult("tool", m.content, 900) };
    }
    if (m.role === "assistant" && m.content.length > 1400) {
      return { ...m, content: `${m.content.slice(0, 1400)}\n[clipped for context]` };
    }
    if (m.role === "system" && m.content.length > 6500) {
      return { ...m, content: `${m.content.slice(0, 6500)}\n[system clipped]` };
    }
    if (m.role === "user" && m.content.length > 2500) {
      return { ...m, content: `${m.content.slice(0, 2500)}\n[user clipped]` };
    }
    return m;
  });
}
