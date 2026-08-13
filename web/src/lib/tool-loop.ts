/** Max model→tools→model cycles before forcing a text answer (AI off / conservative). */
export const MAX_TOOL_ROUNDS = 6;

/** Longer budget when AI chat is on (general agent + multi-step research). */
export const MAX_TOOL_ROUNDS_AI = 12;

export function maxToolRoundsForMode(aiChat?: boolean): number {
  return aiChat ? MAX_TOOL_ROUNDS_AI : MAX_TOOL_ROUNDS;
}

export const TOOL_BUDGET_EXHAUSTED_PROMPT =
  "Tool budget exhausted. Using only the tool results already above, give your final player-facing answer now. Do not call any more tools.";

/**
 * Local models often re-call the same tool with the same args.
 * Return a stub result so the next turn can answer instead of looping.
 */
export function dedupeToolCall(
  seen: Set<string>,
  name: string,
  rawArgs: string,
): { duplicate: boolean; stub?: string } {
  const key = `${name}:${rawArgs.trim() || "{}"}`;
  if (seen.has(key)) {
    return {
      duplicate: true,
      stub: [
        "DUPLICATE_TOOL_CALL: you already ran this exact tool with these arguments.",
        "Do not call tools again. Answer the player using the earlier tool results in this conversation.",
      ].join(" "),
    };
  }
  seen.add(key);
  return { duplicate: false };
}
