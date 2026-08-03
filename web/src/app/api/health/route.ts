import { NextResponse } from "next/server";
import { chatPasswordConfigured } from "@/lib/auth";
import { modelConfigured, preferLocalChat } from "@/lib/local-chat";

export async function GET() {
  const openaiConfigured = modelConfigured();
  const localMode = preferLocalChat();
  return NextResponse.json({
    ok: true,
    service: "warframe-build-agent-web",
    openaiConfigured,
    localMode,
    chatReady: openaiConfigured || localMode,
    passwordRequired: chatPasswordConfigured(),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    visionModel:
      process.env.OPENAI_VISION_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-4o-mini",
    baseUrlConfigured: Boolean(process.env.OPENAI_BASE_URL?.trim()),
  });
}
