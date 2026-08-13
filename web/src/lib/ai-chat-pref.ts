export const AI_CHAT_STORAGE_KEY = "wfba_ai_chat";

/** Returns null when the user has never set a preference. */
export function loadAiChatPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_CHAT_STORAGE_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function saveAiChatEnabled(enabled: boolean): void {
  window.localStorage.setItem(AI_CHAT_STORAGE_KEY, enabled ? "1" : "0");
}

/** Default AI (general agent) off — LLM-on alone is the Warframe advisor. */
export function defaultAiChatEnabled(): boolean {
  return false;
}
