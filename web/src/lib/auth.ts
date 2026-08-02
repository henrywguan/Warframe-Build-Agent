import { cookies } from "next/headers";

export const AUTH_COOKIE = "wfba_chat_auth";

export function chatPasswordConfigured(): boolean {
  return Boolean(process.env.CHAT_PASSWORD?.trim());
}

export function checkPassword(password: string): boolean {
  const expected = process.env.CHAT_PASSWORD?.trim();
  if (!expected) return true;
  return password === expected;
}

export async function isAuthorized(): Promise<boolean> {
  if (!chatPasswordConfigured()) return true;
  const jar = await cookies();
  return jar.get(AUTH_COOKIE)?.value === "ok";
}

export function authCookieValue(): string {
  return "ok";
}
