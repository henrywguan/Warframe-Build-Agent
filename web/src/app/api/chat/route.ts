import { NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { isAuthorized } from "@/lib/auth";
import { resolveChatTurn } from "@/lib/chat-turn";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { chatTools, runChatTool } from "@/lib/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it in web/.env.local (or your host env) to enable chat.",
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

async function runModelCompletion(
  incoming: IncomingMessage[],
  model: string,
): Promise<{ content: string; toolsUsed: string[]; model: string }> {
  const client = getClient();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...incoming
      .filter((m) => m.content?.trim())
      .slice(-20)
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
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

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json(
      { error: "Unauthorized. Enter the chat password first." },
      { status: 401 },
    );
  }

  let body: { messages?: IncomingMessage[] };
  try {
    body = (await request.json()) as { messages?: IncomingMessage[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const incoming = body.messages ?? [];
  if (!incoming.length) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const result = await resolveChatTurn(incoming, {
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
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
