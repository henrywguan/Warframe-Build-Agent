import { NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { isAuthorized } from "@/lib/auth";
import {
  hasImages,
  messageText,
  type IncomingChatMessage,
  type TextContentPart,
} from "@/lib/chat-types";
import { resolveChatTurn } from "@/lib/chat-turn";
import { preferLocalChat, runLocalChat } from "@/lib/local-chat";
import {
  formatLlmConnectionError,
  isLlmConnectionError,
  parseClientLlm,
  resolveApiKey,
  resolveBaseUrl,
  resolveModel,
  type ClientLlmConfig,
} from "@/lib/model-config";
import {
  annotateToolResultForOnlineConsent,
  looksLikeBuildRequest,
} from "@/lib/source-policy";
import {
  fallbackFromToolResults,
  maybeAugmentLookupWithLiveSearch,
} from "@/lib/live-search-augment";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import {
  MAX_TOOL_ROUNDS,
  TOOL_BUDGET_EXHAUSTED_PROMPT,
  dedupeToolCall,
} from "@/lib/tool-loop";
import { getChatTools, runChatTool } from "@/lib/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

function getClient(clientLlm?: Partial<ClientLlmConfig>): OpenAI {
  const apiKey = resolveApiKey(clientLlm);
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Use the LLM / Ollama chip in the chat UI, or set OPENAI_API_KEY / OPENAI_BASE_URL in web/.env.local (or CHAT_MODE=local).",
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: resolveBaseUrl(clientLlm),
  });
}

function toModelContent(
  content: string | TextContentPart[],
): string | ChatCompletionContentPart[] {
  if (typeof content === "string") return content;
  const parts: ChatCompletionContentPart[] = [];
  for (const part of content) {
    if (part.type === "text" && part.text.trim()) {
      parts.push({ type: "text", text: part.text });
    } else if (part.type === "image_url" && part.image_url?.url) {
      parts.push({
        type: "image_url",
        image_url: { url: part.image_url.url },
      });
    }
  }
  return parts.length ? parts : messageText(content) || "(empty)";
}

async function runModelCompletion(
  incoming: IncomingChatMessage[],
  model: string,
  clientLlm?: Partial<ClientLlmConfig>,
  onlineSearchToggle?: boolean,
  aiChat?: boolean,
): Promise<{ content: string; toolsUsed: string[]; model: string }> {
  const client = getClient(clientLlm);
  const history: ChatCompletionMessageParam[] = incoming
    .filter((m) => messageText(m.content) || hasImages([m]))
    .slice(-20)
    .map((m): ChatCompletionMessageParam => {
      const content = toModelContent(m.content);
      if (m.role === "assistant") {
        return {
          role: "assistant",
          content: typeof content === "string" ? content : messageText(m.content),
        };
      }
      return { role: "user", content };
    });

  const latestUser = [...incoming].reverse().find((m) => m.role === "user");
  const buildAsk = latestUser
    ? looksLikeBuildRequest(messageText(latestUser.content))
    : false;
  const consentNote = [
    `\n\n## Runtime LLM\nThis session's model id is \`${model}\`${
      resolveBaseUrl(clientLlm) ? ` at \`${resolveBaseUrl(clientLlm)}\`` : ""
    }. When asked what model/LLM this agent is running, answer with that exact id — do not guess another model name.`,
    aiChat
      ? "\n\n## Runtime mode\n**AI chat is ON.** Give smart, player-friendly answers. Prefer local live tools and `lookup_local_knowledge` first. When you need public corroboration, call `search_web` (includes full-page excerpts) and/or `fetch_web_page` for specific URLs. Cite returned URLs only. Never ask the player to type yes/no for web search."
      : "",
    onlineSearchToggle
      ? "\n\n## Runtime consent\nPlayer enabled the **Online search** toggle. That is standing consent. After `lookup_local_knowledge`, if local Overframe builds are missing or the player wants community comparison, call `search_community_builds` immediately (includes full-page excerpts). Use `fetch_web_page` for any extra URLs. Do NOT ask yes/no. Cite only URLs returned by tools."
      : buildAsk
        ? "\n\n## Runtime consent\n**Online search is OFF.** Stay on local pack + agent-calculated only. Do not call `search_community_builds`. If Overframe builds are missing, tell the player to enable the Online search toggle — never ask them to type yes/no."
        : "",
  ].join("");

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM_PROMPT}${consentNote}` },
    ...history,
  ];

  const tools = getChatTools({
    onlineSearch: Boolean(onlineSearchToggle),
    aiChat: Boolean(aiChat),
  });
  const toolsUsed: string[] = [];
  const toolPayloads: string[] = [];
  const seenToolCalls = new Set<string>();
  let guard = 0;

  while (guard < MAX_TOOL_ROUNDS) {
    guard += 1;
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.4,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) {
      throw new Error("Model returned an empty response");
    }

    messages.push(choice);

    const toolCalls = choice.tool_calls ?? [];
    if (!toolCalls.length) {
      const content = choice.content?.trim();
      return {
        content: content || fallbackFromToolResults(toolPayloads, toolsUsed),
        toolsUsed,
        model,
      };
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      toolsUsed.push(call.function.name);
      const args = call.function.arguments ?? "{}";
      const dedupe = dedupeToolCall(seenToolCalls, call.function.name, args);
      let raw = dedupe.duplicate
        ? dedupe.stub!
        : await runChatTool(call.function.name, args, {
            onlineSearch: Boolean(onlineSearchToggle),
            aiChat: Boolean(aiChat),
          });

      if (!dedupe.duplicate) {
        const augmented = await maybeAugmentLookupWithLiveSearch({
          toolName: call.function.name,
          rawArgs: args,
          result: raw,
          onlineSearch: Boolean(onlineSearchToggle),
          aiChat: Boolean(aiChat),
        });
        raw = augmented.result;
        for (const extra of augmented.extraTools) {
          toolsUsed.push(extra);
          seenToolCalls.add(`${extra}:${args.trim() || "{}"}`);
        }
      }

      toolPayloads.push(raw);
      const toolMessage: ChatCompletionToolMessageParam = {
        role: "tool",
        tool_call_id: call.id,
        content: annotateToolResultForOnlineConsent(
          raw,
          Boolean(onlineSearchToggle),
        ),
      };
      messages.push(toolMessage);
    }
  }

  // Local models (Ollama/Qwen) often keep requesting tools; force a text answer.
  messages.push({ role: "user", content: TOOL_BUDGET_EXHAUSTED_PROMPT });
  const finalCompletion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.4,
  });
  const finalChoice = finalCompletion.choices[0]?.message;
  const content = finalChoice?.content?.trim();
  return {
    content: content || fallbackFromToolResults(toolPayloads, toolsUsed),
    toolsUsed,
    model,
  };
}

function shouldPreferLocal(
  clientLlm?: Partial<ClientLlmConfig>,
  aiChat?: boolean | null,
): boolean {
  // Explicit AI toggle wins over env CHAT_MODE / browser LLM heuristics.
  if (aiChat === true) return false;
  if (aiChat === false) return true;
  // Browser LLM settings override env CHAT_MODE=local so Ollama can be plugged in from the UI.
  if (resolveApiKey(clientLlm)) return false;
  return preferLocalChat();
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json(
      { error: "Unauthorized. Enter the chat password first." },
      { status: 401 },
    );
  }

  let body: {
    messages?: IncomingChatMessage[];
    llm?: unknown;
    onlineSearch?: unknown;
    aiChat?: unknown;
  };
  try {
    body = (await request.json()) as {
      messages?: IncomingChatMessage[];
      llm?: unknown;
      onlineSearch?: unknown;
      aiChat?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const incoming = body.messages ?? [];
  if (!incoming.length) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const clientLlm = parseClientLlm(body.llm);
  const onlineSearchToggle = body.onlineSearch === true;
  const aiChat =
    body.aiChat === true ? true : body.aiChat === false ? false : null;
  const useLocal = shouldPreferLocal(clientLlm, aiChat);
  const model = resolveModel(clientLlm, hasImages(incoming));

  if (aiChat === true && !resolveApiKey(clientLlm)) {
    return NextResponse.json(
      {
        error:
          "AI chat is on but no LLM is configured. Tap LLM / Ollama to add a key or Ollama URL, or turn AI off for the offline chatbot.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await resolveChatTurn(incoming, {
      preferLocal: useLocal,
      activeLlm: {
        model,
        baseUrl: resolveBaseUrl(clientLlm),
        mode: useLocal ? "local-knowledge" : "llm",
        usingVision: hasImages(incoming),
      },
      runLocal: (messages) => runLocalChat(messages),
      runModel: (messages) =>
        runModelCompletion(
          messages,
          model,
          clientLlm,
          onlineSearchToggle,
          aiChat === true,
        ),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("kept calling tools") || message.includes("Too many tool rounds")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    if (message.includes("empty response")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const shouldFallbackLocal =
      message.includes("OPENAI_API_KEY") || isLlmConnectionError(error);

    // Missing key or unreachable Ollama/proxy → offline knowledge chatbot.
    if (shouldFallbackLocal) {
      try {
        const local = await runLocalChat(incoming);
        const prefix = isLlmConnectionError(error)
          ? `${formatLlmConnectionError(error, clientLlm)}\n\nFalling back to local chatbot:\n\n`
          : "";
        return NextResponse.json({
          message: {
            role: "assistant",
            content: `${prefix}${local.content}`,
          },
          toolsUsed: local.toolsUsed,
          model: local.model,
          fallback: isLlmConnectionError(error) ? "local-after-llm-unreachable" : "local-after-missing-key",
        });
      } catch (localError) {
        const localMessage =
          localError instanceof Error ? localError.message : String(localError);
        if (isLlmConnectionError(error)) {
          return NextResponse.json(
            { error: formatLlmConnectionError(error, clientLlm) },
            { status: 503 },
          );
        }
        return NextResponse.json({ error: localMessage }, { status: 503 });
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
