import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  authCookieValue,
  chatPasswordConfigured,
  checkPassword,
} from "@/lib/auth";

export async function GET() {
  return NextResponse.json({
    passwordRequired: chatPasswordConfigured(),
  });
}

export async function POST(request: Request) {
  if (!chatPasswordConfigured()) {
    return NextResponse.json({ ok: true, passwordRequired: false });
  }

  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;
  const password = body?.password ?? "";

  if (!checkPassword(password)) {
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, authCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
