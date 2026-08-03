import type {
  DailyPatchChanges,
  DailyPatchSnapshot,
  PatchEntry,
} from "./types.js";

function formatEntry(entry: PatchEntry, index?: number): string {
  const prefix = index === undefined ? "•" : `${index + 1}.`;
  const newest = entry.newest ? " [Newest]" : "";
  const version = entry.version ? ` (${entry.version})` : "";
  return [
    `${prefix} ${entry.type}${newest}: ${entry.title}${version}`,
    `   ${entry.url}`,
  ].join("\n");
}

export function formatSnapshot(
  snapshot: DailyPatchSnapshot,
  options: { limit?: number } = {},
): string {
  const limit = options.limit ?? 15;
  const lines = [
    `Warframe patch notes — ${snapshot.date} (${snapshot.timezone})`,
    `Source: ${snapshot.source}`,
    `Pulled at: ${snapshot.pulledAt}`,
    `Entries: ${snapshot.entries.length}`,
    "",
  ];

  const newest = snapshot.entries.find((e) => e.newest);
  if (newest) {
    lines.push("Latest marked Newest:", formatEntry(newest), "");
  }

  lines.push(`Recent entries (showing ${Math.min(limit, snapshot.entries.length)}):`);
  for (const [i, entry] of snapshot.entries.slice(0, limit).entries()) {
    lines.push(formatEntry(entry, i));
  }
  if (snapshot.entries.length > limit) {
    lines.push(`…and ${snapshot.entries.length - limit} more`);
  }
  return lines.join("\n");
}

export function formatPatchChanges(changes: DailyPatchChanges): string {
  const lines = [
    `Warframe patch-note changes — ${changes.previousDate} → ${changes.date}`,
    `Timezone: ${changes.timezone}`,
    `Source: ${changes.source}`,
    "",
  ];

  if (changes.latest) {
    lines.push("Current Newest on hub:", formatEntry(changes.latest), "");
  }

  if (!changes.newEntries.length) {
    lines.push("No new updates/hotfixes since the previous snapshot.");
  } else {
    lines.push(`New since previous snapshot (${changes.newEntries.length}):`);
    for (const [i, entry] of changes.newEntries.entries()) {
      lines.push(formatEntry(entry, i));
    }
  }

  if (changes.removedIds.length) {
    lines.push(
      "",
      `Removed/no longer listed (${changes.removedIds.length}): ${changes.removedIds.join(", ")}`,
    );
  }

  lines.push(
    "",
    "Hub: https://www.warframe.com/en/patch-notes — verify details in the linked notes.",
  );
  return lines.join("\n");
}
