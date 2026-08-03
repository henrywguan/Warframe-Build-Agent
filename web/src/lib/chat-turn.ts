import {
  isSlashCommand,
  runSlashCommand,
  type CommandResult,
} from "./commands";

export interface ChatTurnMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTurnResult {
  message: { role: "assistant"; content: string };
  toolsUsed: string[];
  model: string;
}

export interface ChatTurnDeps {
  runSlash?: (text: string) => Promise<CommandResult>;
  runModel: (messages: ChatTurnMessage[]) => Promise<{
    content: string;
    toolsUsed: string[];
    model: string;
  }>;
}

/**
 * Shared chat resolution used by the API route and integrity tests:
 * slash commands first, then the model completion path.
 */
export async function resolveChatTurn(
  incoming: ChatTurnMessage[],
  deps: ChatTurnDeps,
): Promise<ChatTurnResult> {
  const runSlash = deps.runSlash ?? runSlashCommand;
  const latestUser = [...incoming].reverse().find((m) => m.role === "user");
  if (latestUser && isSlashCommand(latestUser.content)) {
    const result = await runSlash(latestUser.content);
    if (result.handled) {
      return {
        message: { role: "assistant", content: result.content },
        toolsUsed: result.toolsUsed,
        model: "slash-command",
      };
    }
  }

  const modelResult = await deps.runModel(incoming);
  return {
    message: { role: "assistant", content: modelResult.content },
    toolsUsed: modelResult.toolsUsed,
    model: modelResult.model,
  };
}
