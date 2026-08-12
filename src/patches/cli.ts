#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PatchNotesClient, PatchNotesError } from "./client.js";
import {
  PATCH_DETAIL_DEFAULT_MAX_CHARS,
  formatPatchDetail,
} from "./detail.js";
import { formatPatchChanges, formatSnapshot } from "./format.js";
import {
  buildDailySnapshot,
  computePatchChanges,
  findPreviousSnapshot,
  isDailyPullWindow,
  pacificDateString,
  pacificHour,
  readSnapshot,
  runDailyPatchCheck,
} from "./snapshot.js";
import {
  PATCH_DAILY_PULL_HOUR,
  PATCH_DAILY_PULL_TIMEZONE,
  PATCH_NOTES_URL,
  type DailyPatchChanges,
} from "./types.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_DATA_DIR = path.join(ROOT, "data/patches");

const COMMANDS = [
  "latest",
  "detail",
  "check",
  "pull",
  "changes",
  "status",
  "help",
] as const;
type Command = (typeof COMMANDS)[number];

interface ParsedArgs {
  command: Command;
  json: boolean;
  force: boolean;
  dataDir: string;
  limit: number;
  /** Version, slug, URL, or latest — used by `detail`. */
  detailQuery: string;
  maxChars: number;
}

function printHelp(): void {
  console.log(`Warframe patch notes CLI
Source: ${PATCH_NOTES_URL}

Usage:
  npm run patches -- <command> [options]

Commands:
  latest     Show current hub entries (live fetch) — titles/links only
  detail     Fetch full official text for a version/URL (or newest)
  check      Alias of pull --force summary for ad-hoc checks
  pull       Daily job: snapshot at 4pm Pacific, write new-entry diff
  changes    Show latest saved day-over-day new updates/hotfixes
  status     Show Pacific time / pull-window status
  help       Show help

Examples:
  npm run patches -- detail
  npm run patches -- detail 43.0.8
  npm run patches -- detail https://www.warframe.com/en/patch-notes/pc/43-0-8

Options:
  --data-dir <path>   Default: data/patches
  --limit <n>         How many entries to print for latest (default 15)
  --max-chars <n>     Body length cap for detail (default ${PATCH_DETAIL_DEFAULT_MAX_CHARS})
  --force             For pull: ignore 4pm Pacific window check
  --json              Print raw JSON
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const raw = args.shift() ?? "help";
  const command =
    raw === "--help" || raw === "-h"
      ? "help"
      : ((COMMANDS as readonly string[]).includes(raw) ? (raw as Command) : null);

  if (!command) {
    throw new Error(`Unknown command "${raw}". Run with --help.`);
  }

  const parsed: ParsedArgs = {
    command,
    json: false,
    force: false,
    dataDir: DEFAULT_DATA_DIR,
    limit: 15,
    detailQuery: "latest",
    maxChars: PATCH_DETAIL_DEFAULT_MAX_CHARS,
  };

  while (args.length) {
    const token = args.shift()!;
    switch (token) {
      case "--help":
      case "-h":
        parsed.command = "help";
        break;
      case "--json":
        parsed.json = true;
        break;
      case "--force":
        parsed.force = true;
        break;
      case "--data-dir": {
        const value = args.shift();
        if (!value) throw new Error("--data-dir requires a path");
        parsed.dataDir = path.resolve(value);
        break;
      }
      case "--limit": {
        const value = args.shift();
        if (!value) throw new Error("--limit requires a number");
        parsed.limit = Number(value);
        if (!Number.isFinite(parsed.limit) || parsed.limit < 1) {
          throw new Error("--limit must be a positive number");
        }
        break;
      }
      case "--max-chars": {
        const value = args.shift();
        if (!value) throw new Error("--max-chars requires a number");
        parsed.maxChars = Number(value);
        if (!Number.isFinite(parsed.maxChars) || parsed.maxChars < 500) {
          throw new Error("--max-chars must be at least 500");
        }
        break;
      }
      default:
        if (parsed.command === "detail" && !token.startsWith("-")) {
          parsed.detailQuery = token;
          break;
        }
        throw new Error(`Unknown option "${token}"`);
    }
  }

  return parsed;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.command === "help") {
    printHelp();
    return;
  }

  const print = (value: unknown, text: string) => {
    if (parsed.json) console.log(JSON.stringify(value, null, 2));
    else console.log(text);
  };

  switch (parsed.command) {
    case "status": {
      const now = new Date();
      const payload = {
        timezone: PATCH_DAILY_PULL_TIMEZONE,
        pacificDate: pacificDateString(now),
        pacificHour: pacificHour(now),
        dailyPullHour: PATCH_DAILY_PULL_HOUR,
        inPullWindow: isDailyPullWindow(now),
        source: PATCH_NOTES_URL,
      };
      print(
        payload,
        [
          `Timezone: ${payload.timezone}`,
          `Pacific date: ${payload.pacificDate}`,
          `Pacific hour: ${payload.pacificHour}`,
          `Daily pull hour: ${payload.dailyPullHour}:00`,
          `In pull window: ${payload.inPullWindow ? "yes" : "no"}`,
          `Source: ${payload.source}`,
        ].join("\n"),
      );
      break;
    }
    case "latest": {
      const snapshot = await buildDailySnapshot({
        client: new PatchNotesClient(),
      });
      print(snapshot, formatSnapshot(snapshot, { limit: parsed.limit }));
      break;
    }
    case "detail": {
      const client = new PatchNotesClient();
      const detail = await client.fetchDetail(parsed.detailQuery, {
        maxChars: parsed.maxChars,
      });
      print(detail, formatPatchDetail(detail));
      break;
    }
    case "check": {
      // Ad-hoc live check; always force a snapshot write for convenience.
      const result = await runDailyPatchCheck({
        dataDir: parsed.dataDir,
        client: new PatchNotesClient(),
        requirePullWindow: false,
      });
      if (parsed.json) {
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      console.log(formatSnapshot(result.snapshot!, { limit: parsed.limit }));
      console.log("");
      if (result.changes) console.log(formatPatchChanges(result.changes));
      else {
        console.log(
          "Baseline snapshot saved. Day-over-day new patches will appear after the next daily pull.",
        );
      }
      if (result.snapshotFile) console.log(`\nWrote ${result.snapshotFile}`);
      if (result.changesFile) console.log(`Wrote ${result.changesFile}`);
      break;
    }
    case "pull": {
      const result = await runDailyPatchCheck({
        dataDir: parsed.dataDir,
        client: new PatchNotesClient(),
        requirePullWindow: !parsed.force,
      });
      if (result.skipped) {
        print({ skipped: result.skipped }, `Skipped: ${result.skipped}`);
        return;
      }
      if (parsed.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(formatSnapshot(result.snapshot!, { limit: parsed.limit }));
      console.log("");
      if (result.changes) console.log(formatPatchChanges(result.changes));
      else {
        console.log(
          "Baseline snapshot saved. Day-over-day new patches will appear after the next daily pull.",
        );
      }
      if (result.snapshotFile) console.log(`\nWrote ${result.snapshotFile}`);
      if (result.changesFile) console.log(`Wrote ${result.changesFile}`);
      break;
    }
    case "changes": {
      const latestPath = path.join(parsed.dataDir, "latest-changes.json");
      try {
        const { readFile } = await import("node:fs/promises");
        const raw = await readFile(latestPath, "utf8");
        const changes = JSON.parse(raw) as DailyPatchChanges;
        print(changes, formatPatchChanges(changes));
      } catch {
        const today = pacificDateString();
        const current = await readSnapshot(parsed.dataDir, today);
        const previous = current
          ? await findPreviousSnapshot(parsed.dataDir, current.date)
          : await findPreviousSnapshot(parsed.dataDir, today);
        if (!current || !previous) {
          throw new Error(
            "No saved patch-note changes yet. Run: npm run patches -- pull --force",
          );
        }
        const changes = computePatchChanges(previous, current);
        print(changes, formatPatchChanges(changes));
      }
      break;
    }
    default:
      printHelp();
  }
}

main().catch((error: unknown) => {
  if (error instanceof PatchNotesError) {
    console.error(`${error.message} [status=${error.status}]`);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
