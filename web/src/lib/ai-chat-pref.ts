/**
 * Browser preference for the WebUI **AI** toggle.
 * When on, the chat API runs Cursor-class general-agent mode (search_web,
 * fetch_web_page, reasoning loop) plus Warframe specialty tools.
 */
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

/** Default AI on when a browser LLM is ready; otherwise off (offline chatbot). */
export function defaultAiChatEnabled(llmReady: boolean): boolean {
  return llmReady;
}
