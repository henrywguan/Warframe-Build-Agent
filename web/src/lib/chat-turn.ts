import {
  messageText,
  type IncomingChatMessage,
} from "@/lib/chat-types";
import {
  type ActiveLlmIdentity,
  formatActiveLlmReply,
  looksLikeModelIdentityQuestion,
} from "@/lib/model-config";
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
  /** Resolved model for this request — used for identity questions / `/model`. */
  activeLlm?: ActiveLlmIdentity;
}

/**
 * Shared chat resolution used by the API route and integrity tests:
 * model-identity questions, slash commands, then local or model completion.
 */
export async function resolveChatTurn(
  incoming: IncomingChatMessage[],
  deps: ChatTurnDeps,
): Promise<ChatTurnResult> {
  const runSlash = deps.runSlash ?? runSlashCommand;
  const latestUser = [...incoming].reverse().find((m) => m.role === "user");
  const latestText = latestUser ? messageText(latestUser.content) : "";

  if (latestText && looksLikeModelIdentityQuestion(latestText) && deps.activeLlm) {
    return {
      message: {
        role: "assistant",
        content: formatActiveLlmReply(deps.activeLlm),
      },
      toolsUsed: [],
      model:
        deps.activeLlm.mode === "local-knowledge"
          ? "local-knowledge"
          : deps.activeLlm.model,
    };
  }

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
