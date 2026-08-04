export const ONLINE_SEARCH_STORAGE_KEY = "wfba_online_search";

export function loadOnlineSearchEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONLINE_SEARCH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveOnlineSearchEnabled(enabled: boolean): void {
  window.localStorage.setItem(ONLINE_SEARCH_STORAGE_KEY, enabled ? "1" : "0");
}
