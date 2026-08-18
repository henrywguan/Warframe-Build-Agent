import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { liveMarketIngameQuotes } from "@/lib/warframe-live";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json(
      { error: "Unauthorized. Enter the chat password first." },
      { status: 401 },
    );
  }

  let body: { query?: unknown };
  try {
    body = (await request.json()) as { query?: unknown };
  } catch {
    return NextResponse.json({ error: "Expected JSON { query }." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "Enter an item name." }, { status: 400 });
  }

  try {
    const result = await liveMarketIngameQuotes(query);
    return NextResponse.json({
      content: result.content,
      quotes: result.quotes ?? null,
      matches: result.matches ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Warframe.market lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
