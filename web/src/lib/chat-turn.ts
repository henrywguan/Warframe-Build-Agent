import {
  messageText,
  type IncomingChatMessage,
} from "@/lib/chat-types";
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
  runModel: (messages: IncomingChatMessage[]) => Promise<{
    content: string;
    toolsUsed: string[];
    model: string;
  }>;
  /** Optional fully-local path (no cloud LLM). */
  runLocal?: (messages: IncomingChatMessage[]) => Promise<{
    content: string;
    toolsUsed: string[];
    model: string;
  }>;
  preferLocal?: boolean;
}

/**
 * Shared chat resolution used by the API route and integrity tests:
 * slash commands first, then local or model completion path.
 */
export async function resolveChatTurn(
  incoming: IncomingChatMessage[],
  deps: ChatTurnDeps,
): Promise<ChatTurnResult> {
  const runSlash = deps.runSlash ?? runSlashCommand;
  const latestUser = [...incoming].reverse().find((m) => m.role === "user");
  const latestText = latestUser ? messageText(latestUser.content) : "";

  if (latestUser && latestText && isSlashCommand(latestText)) {
    // Image+slash still goes to model/local so screenshots can be processed.
    const hasImage =
      typeof latestUser.content !== "string" &&
      latestUser.content.some((part) => part.type === "image_url");
    if (!hasImage) {
      const result = await runSlash(latestText);
      if (result.handled) {
        return {
          message: { role: "assistant", content: result.content },
          toolsUsed: result.toolsUsed,
          model: "slash-command",
        };
      }
    }
  }

  if (deps.preferLocal && deps.runLocal) {
    const localResult = await deps.runLocal(incoming);
    return {
      message: { role: "assistant", content: localResult.content },
      toolsUsed: localResult.toolsUsed,
      model: localResult.model,
    };
  }

  const modelResult = await deps.runModel(incoming);
  return {
    message: { role: "assistant", content: modelResult.content },
    toolsUsed: modelResult.toolsUsed,
    model: modelResult.model,
  };
}
