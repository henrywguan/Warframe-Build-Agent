import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PatchNotesClient } from "./client.js";
import { computeNewEntries } from "./parse.js";
import {
  PATCH_DAILY_PULL_HOUR,
  PATCH_DAILY_PULL_TIMEZONE,
  PATCH_NOTES_URL,
  type DailyPatchChanges,
  type DailyPatchSnapshot,
} from "./types.js";

export function pacificDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PATCH_DAILY_PULL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function pacificHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: PATCH_DAILY_PULL_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const parsed = Number(hour);
  return parsed === 24 ? 0 : parsed;
}

export function isDailyPullWindow(now = new Date()): boolean {
  return pacificHour(now) === PATCH_DAILY_PULL_HOUR;
}

export function snapshotPath(dataDir: string, date: string): string {
  return path.join(dataDir, `snapshot-${date}.json`);
}

export function changesPath(dataDir: string, date: string): string {
  return path.join(dataDir, `changes-${date}.json`);
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readSnapshot(
  dataDir: string,
  date: string,
): Promise<DailyPatchSnapshot | null> {
  try {
    const raw = await readFile(snapshotPath(dataDir, date), "utf8");
    return JSON.parse(raw) as DailyPatchSnapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function findPreviousSnapshot(
  dataDir: string,
  beforeDate: string,
): Promise<DailyPatchSnapshot | null> {
  let names: string[];
  try {
    names = await readdir(dataDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }

  const dates = names
    .map((name) => name.match(/^snapshot-(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
    .filter((date): date is string => !!date && date < beforeDate)
    .sort();

  const previousDate = dates.at(-1);
  if (!previousDate) return null;
  return readSnapshot(dataDir, previousDate);
}

export async function buildDailySnapshot(options: {
  client?: PatchNotesClient;
  now?: Date;
}): Promise<DailyPatchSnapshot> {
  const now = options.now ?? new Date();
  const client = options.client ?? new PatchNotesClient();
  const entries = await client.listEntries();

  return {
    date: pacificDateString(now),
    timezone: PATCH_DAILY_PULL_TIMEZONE,
    pulledAt: now.toISOString(),
    source: client.hubUrl || PATCH_NOTES_URL,
    entries,
  };
}

export function computePatchChanges(
  previous: DailyPatchSnapshot,
  current: DailyPatchSnapshot,
): DailyPatchChanges {
  const { newEntries, removedIds } = computeNewEntries(
    previous.entries,
    current.entries,
  );
  const latest =
    current.entries.find((entry) => entry.newest) ?? current.entries[0] ?? null;

  return {
    date: current.date,
    previousDate: previous.date,
    timezone: current.timezone,
    generatedAt: new Date().toISOString(),
    source: current.source,
    newEntries,
    removedIds,
    latest,
  };
}

export async function runDailyPatchCheck(options: {
  dataDir: string;
  client?: PatchNotesClient;
  now?: Date;
  requirePullWindow?: boolean;
}): Promise<{
  skipped?: string;
  snapshot: DailyPatchSnapshot | null;
  changes: DailyPatchChanges | null;
  snapshotFile?: string;
  changesFile?: string;
  latestSnapshotFile?: string;
  latestChangesFile?: string;
}> {
  const now = options.now ?? new Date();
  if (options.requirePullWindow && !isDailyPullWindow(now)) {
    return {
      skipped: `Outside ${PATCH_DAILY_PULL_HOUR}:00 ${PATCH_DAILY_PULL_TIMEZONE} pull window`,
      snapshot: null,
      changes: null,
    };
  }

  const snapshot = await buildDailySnapshot({
    client: options.client,
    now,
  });

  const snapshotFile = snapshotPath(options.dataDir, snapshot.date);
  await writeJson(snapshotFile, snapshot);

  const latestSnapshotFile = path.join(options.dataDir, "latest-snapshot.json");
  await writeJson(latestSnapshotFile, snapshot);

  const previous = await findPreviousSnapshot(options.dataDir, snapshot.date);
  let changes: DailyPatchChanges | null = null;
  let changesFile: string | undefined;
  let latestChangesFile: string | undefined;

  if (previous) {
    changes = computePatchChanges(previous, snapshot);
    changesFile = changesPath(options.dataDir, snapshot.date);
    await writeJson(changesFile, changes);
    latestChangesFile = path.join(options.dataDir, "latest-changes.json");
    await writeJson(latestChangesFile, changes);
  }

  return {
    snapshot,
    changes,
    snapshotFile,
    changesFile,
    latestSnapshotFile,
    latestChangesFile,
  };
}
