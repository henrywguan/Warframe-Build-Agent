/** Official Warframe patch notes hub (PC). */
export const PATCH_NOTES_URL = "https://www.warframe.com/en/patch-notes";
export const PATCH_NOTES_PC_URL = "https://www.warframe.com/en/patch-notes/pc";

/** Daily pull target: 4:00 PM America/Los_Angeles (PST/PDT). */
export const PATCH_DAILY_PULL_TIMEZONE = "America/Los_Angeles";
export const PATCH_DAILY_PULL_HOUR = 16;

export type PatchType = "Hotfix" | "Update" | "Other";

export interface PatchEntry {
  /** URL slug, e.g. `43-0-8`. */
  id: string;
  title: string;
  url: string;
  type: PatchType;
  /** True when the hub marks the entry as Newest. */
  newest: boolean;
  /** Parsed version like `43.0.8` when present in the title/slug. */
  version?: string;
}

export interface DailyPatchSnapshot {
  date: string;
  timezone: string;
  pulledAt: string;
  source: string;
  entries: PatchEntry[];
}

export interface DailyPatchChanges {
  date: string;
  previousDate: string;
  timezone: string;
  generatedAt: string;
  source: string;
  newEntries: PatchEntry[];
  removedIds: string[];
  latest: PatchEntry | null;
}

export interface PatchClientOptions {
  hubUrl?: string;
  fetchImpl?: typeof fetch;
  userAgent?: string;
}
