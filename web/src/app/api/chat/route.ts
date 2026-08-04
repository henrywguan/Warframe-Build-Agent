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
  conversationAllowsOnlineBuildSearch,
  looksLikeBuildRequest,
} from "@/lib/source-policy";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { chatTools, runChatTool } from "@/lib/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it in web/.env.local, point OPENAI_BASE_URL at a local model, or set CHAT_MODE=local for the offline knowledge chatbot.",
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
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
): Promise<{ content: string; toolsUsed: string[]; model: string }> {
  const client = getClient();
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

  const consentMessages = incoming.map((m) => ({
    role: m.role,
    content: messageText(m.content),
  }));
  const onlineAllowed = conversationAllowsOnlineBuildSearch(consentMessages);
  const latestUser = [...incoming].reverse().find((m) => m.role === "user");
  const buildAsk = latestUser
    ? looksLikeBuildRequest(messageText(latestUser.content))
    : false;
  const consentNote = buildAsk
    ? onlineAllowed
      ? "\n\n## Runtime consent\nPlayer has allowed online build search in this conversation. You may use public Overframe/YouTube sources when local builds are insufficient. Still prefer the local pack first."
      : "\n\n## Runtime consent\nPlayer has NOT consented to online build search. Stay on local pack + agent-calculated only. If Overframe builds are missing, ask yes/no — do not invent community builds."
    : "";

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM_PROMPT}${consentNote}` },
    ...history,
  ];

  const toolsUsed: string[] = [];
  let guard = 0;

  while (guard < 4) {
    guard += 1;
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools: chatTools,
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
      return {
        content: choice.content?.trim() || "I do not have a response for that.",
        toolsUsed,
        model,
      };
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      toolsUsed.push(call.function.name);
      const result = await runChatTool(
        call.function.name,
        call.function.arguments ?? "{}",
      );
      const toolMessage: ChatCompletionToolMessageParam = {
        role: "tool",
        tool_call_id: call.id,
        content: result,
      };
      messages.push(toolMessage);
    }
  }

  throw new Error("Too many tool rounds. Try a narrower question.");
}

function pickModel(incoming: IncomingChatMessage[]): string {
  const defaultModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  if (hasImages(incoming)) {
    return process.env.OPENAI_VISION_MODEL?.trim() || defaultModel;
  }
  return defaultModel;
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json(
      { error: "Unauthorized. Enter the chat password first." },
      { status: 401 },
    );
  }

  let body: { messages?: IncomingChatMessage[] };
  try {
    body = (await request.json()) as { messages?: IncomingChatMessage[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const incoming = body.messages ?? [];
  if (!incoming.length) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const useLocal = preferLocalChat();
  const model = pickModel(incoming);

  try {
    const result = await resolveChatTurn(incoming, {
      preferLocal: useLocal,
      runLocal: (messages) => runLocalChat(messages),
      runModel: (messages) => runModelCompletion(messages, model),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Too many tool rounds")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    if (message.includes("empty response")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    // If model path fails for missing key, fall back to local chatbot.
    if (message.includes("OPENAI_API_KEY")) {
      try {
        const local = await runLocalChat(incoming);
        return NextResponse.json({
          message: { role: "assistant", content: local.content },
          toolsUsed: local.toolsUsed,
          model: local.model,
        });
      } catch (localError) {
        const localMessage =
          localError instanceof Error ? localError.message : String(localError);
        return NextResponse.json({ error: localMessage }, { status: 503 });
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
