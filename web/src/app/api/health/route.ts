import { NextResponse } from "next/server";
import { chatPasswordConfigured } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "warframe-build-agent-web",
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    passwordRequired: chatPasswordConfigured(),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  });
}
