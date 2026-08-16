/** Browser-persisted Saved Builds (Arsenal pane) — desktop web UI. */

export const SAVED_BUILDS_STORAGE_KEY = "wfba_saved_builds_v1";
export const MAX_SAVED_BUILDS = 60;
export const MAX_BUILD_FOLDERS = 24;

export type GearSlot = {
  name: string;
  mods: string[];
  arcanes: string[];
};

export type ArchonCrystal = {
  /** e.g. Crimson, Amber, Azure, Violet, Topaz, Emerald */
  color: string;
  tauforged?: boolean;
  effect: string;
};

export type SavedBuild = {
  id: string;
  name: string;
  /** null = Unfiled */
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  warframe: GearSlot;
  primary: GearSlot;
  secondary: GearSlot;
  melee: GearSlot;
  companion: GearSlot;
  archonCrystals: ArchonCrystal[];
  notes?: string;
};

export type BuildFolder = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type SavedBuildsMemory = {
  version: 1;
  folders: BuildFolder[];
  builds: SavedBuild[];
};

export function newBuildId(prefix = "build"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyGear(name = ""): GearSlot {
  return { name, mods: [], arcanes: [] };
}

export function createEmptyBuild(
  partial?: Partial<SavedBuild>,
  now = Date.now(),
): SavedBuild {
  return {
    id: newBuildId("build"),
    name: partial?.name?.trim() || "New build",
    folderId: partial?.folderId ?? null,
    createdAt: now,
    updatedAt: now,
    warframe: partial?.warframe ?? emptyGear(),
    primary: partial?.primary ?? emptyGear(),
    secondary: partial?.secondary ?? emptyGear(),
    melee: partial?.melee ?? emptyGear(),
    companion: partial?.companion ?? emptyGear(),
    archonCrystals: partial?.archonCrystals ?? [],
    ...(partial?.notes?.trim() ? { notes: partial.notes.trim() } : {}),
  };
}

export function emptySavedBuilds(): SavedBuildsMemory {
  return { version: 1, folders: [], builds: [] };
}

function normalizeGear(raw: unknown): GearSlot {
  if (!raw || typeof raw !== "object") return emptyGear();
  const g = raw as Partial<GearSlot>;
  return {
    name: typeof g.name === "string" ? g.name : "",
    mods: Array.isArray(g.mods)
      ? g.mods.filter((m): m is string => typeof m === "string" && Boolean(m.trim())).map((m) => m.trim())
      : [],
    arcanes: Array.isArray(g.arcanes)
      ? g.arcanes
          .filter((m): m is string => typeof m === "string" && Boolean(m.trim()))
          .map((m) => m.trim())
      : [],
  };
}

function normalizeCrystal(raw: unknown): ArchonCrystal | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<ArchonCrystal>;
  const effect = typeof c.effect === "string" ? c.effect.trim() : "";
  const color = typeof c.color === "string" ? c.color.trim() : "";
  if (!effect && !color) return null;
  return {
    color: color || "Unknown",
    effect: effect || color,
    ...(c.tauforged ? { tauforged: true as const } : {}),
  };
}

export function loadSavedBuilds(): SavedBuildsMemory {
  if (typeof window === "undefined") return emptySavedBuilds();
  try {
    const raw = window.localStorage.getItem(SAVED_BUILDS_STORAGE_KEY);
    if (!raw) return emptySavedBuilds();
    const parsed = JSON.parse(raw) as Partial<SavedBuildsMemory>;
    if (parsed.version !== 1) return emptySavedBuilds();
    const folders = (Array.isArray(parsed.folders) ? parsed.folders : [])
      .filter((f): f is BuildFolder => Boolean(f && typeof f.id === "string"))
      .map((f) => ({
        id: f.id,
        name: typeof f.name === "string" && f.name.trim() ? f.name.trim() : "Folder",
        createdAt: Number(f.createdAt) || Date.now(),
        updatedAt: Number(f.updatedAt) || Date.now(),
      }))
      .slice(0, MAX_BUILD_FOLDERS);
    const folderIds = new Set(folders.map((f) => f.id));
    const builds = (Array.isArray(parsed.builds) ? parsed.builds : [])
      .filter((b): b is SavedBuild => Boolean(b && typeof b.id === "string"))
      .map((b) => {
        const created = createEmptyBuild({
          name: typeof b.name === "string" && b.name.trim() ? b.name.trim() : "New build",
          folderId:
            typeof b.folderId === "string" && folderIds.has(b.folderId) ? b.folderId : null,
          warframe: normalizeGear(b.warframe),
          primary: normalizeGear(b.primary),
          secondary: normalizeGear(b.secondary),
          melee: normalizeGear(b.melee),
          companion: normalizeGear(b.companion),
          archonCrystals: Array.isArray(b.archonCrystals)
            ? b.archonCrystals.map(normalizeCrystal).filter((c): c is ArchonCrystal => Boolean(c))
            : [],
          notes: typeof b.notes === "string" ? b.notes : undefined,
        });
        return {
          ...created,
          id: b.id,
          createdAt: Number(b.createdAt) || created.createdAt,
          updatedAt: Number(b.updatedAt) || created.updatedAt,
        };
      })
      .slice(0, MAX_SAVED_BUILDS);
    return { version: 1, folders, builds };
  } catch {
    return emptySavedBuilds();
  }
}

export function saveSavedBuilds(memory: SavedBuildsMemory): void {
  if (typeof window === "undefined") return;
  const payload: SavedBuildsMemory = {
    version: 1,
    folders: memory.folders.slice(0, MAX_BUILD_FOLDERS),
    builds: memory.builds.slice(0, MAX_SAVED_BUILDS),
  };
  try {
    window.localStorage.setItem(SAVED_BUILDS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    const trimmed = {
      ...payload,
      builds: payload.builds.slice(0, Math.max(8, Math.floor(payload.builds.length / 2))),
    };
    try {
      window.localStorage.setItem(SAVED_BUILDS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* quota exhausted */
    }
  }
}

export function addFolder(
  memory: SavedBuildsMemory,
  name = "New folder",
  now = Date.now(),
): SavedBuildsMemory {
  if (memory.folders.length >= MAX_BUILD_FOLDERS) return memory;
  const folder: BuildFolder = {
    id: newBuildId("folder"),
    name: name.trim() || "New folder",
    createdAt: now,
    updatedAt: now,
  };
  return { ...memory, folders: [...memory.folders, folder] };
}

export function renameFolder(
  memory: SavedBuildsMemory,
  folderId: string,
  name: string,
  now = Date.now(),
): SavedBuildsMemory {
  const next = name.trim();
  if (!next) return memory;
  return {
    ...memory,
    folders: memory.folders.map((f) =>
      f.id === folderId ? { ...f, name: next, updatedAt: now } : f,
    ),
  };
}

export function deleteFolder(
  memory: SavedBuildsMemory,
  folderId: string,
): SavedBuildsMemory {
  return {
    folders: memory.folders.filter((f) => f.id !== folderId),
    builds: memory.builds.map((b) =>
      b.folderId === folderId ? { ...b, folderId: null } : b,
    ),
    version: 1,
  };
}

export function addBuild(
  memory: SavedBuildsMemory,
  build: SavedBuild,
): SavedBuildsMemory {
  return {
    ...memory,
    builds: [build, ...memory.builds].slice(0, MAX_SAVED_BUILDS),
  };
}

export function updateBuild(
  memory: SavedBuildsMemory,
  buildId: string,
  patch: Partial<SavedBuild>,
  now = Date.now(),
): SavedBuildsMemory {
  return {
    ...memory,
    builds: memory.builds.map((b) =>
      b.id === buildId
        ? {
            ...b,
            ...patch,
            id: b.id,
            createdAt: b.createdAt,
            updatedAt: now,
            warframe: patch.warframe ? normalizeGear(patch.warframe) : b.warframe,
            primary: patch.primary ? normalizeGear(patch.primary) : b.primary,
            secondary: patch.secondary ? normalizeGear(patch.secondary) : b.secondary,
            melee: patch.melee ? normalizeGear(patch.melee) : b.melee,
            companion: patch.companion ? normalizeGear(patch.companion) : b.companion,
            archonCrystals: patch.archonCrystals
              ? patch.archonCrystals
                  .map(normalizeCrystal)
                  .filter((c): c is ArchonCrystal => Boolean(c))
              : b.archonCrystals,
          }
        : b,
    ),
  };
}

export function renameBuild(
  memory: SavedBuildsMemory,
  buildId: string,
  name: string,
  now = Date.now(),
): SavedBuildsMemory {
  const next = name.trim();
  if (!next) return memory;
  return updateBuild(memory, buildId, { name: next }, now);
}

export function deleteBuild(
  memory: SavedBuildsMemory,
  buildId: string,
): SavedBuildsMemory {
  return {
    ...memory,
    builds: memory.builds.filter((b) => b.id !== buildId),
  };
}

export function buildsInFolder(
  memory: SavedBuildsMemory,
  folderId: string | null | "all",
): SavedBuild[] {
  if (folderId === "all") return memory.builds;
  if (folderId === null) return memory.builds.filter((b) => b.folderId === null);
  return memory.builds.filter((b) => b.folderId === folderId);
}

/** Split comma / semicolon / newline lists. */
export function splitList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function takeKv(map: Map<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const hit = map.get(key);
    if (hit) return hit;
  }
  return "";
}

function gearFromKv(
  map: Map<string, string>,
  nameKeys: string[],
  modKeys: string[],
  arcaneKeys: string[],
): GearSlot {
  return {
    name: takeKv(map, ...nameKeys),
    mods: splitList(takeKv(map, ...modKeys)),
    arcanes: splitList(takeKv(map, ...arcaneKeys)),
  };
}

function parseCrystals(raw: string): ArchonCrystal[] {
  return splitList(raw).map((entry) => {
    const tauforged = /tau/i.test(entry);
    const cleaned = entry.replace(/\btau(?:forged)?\b/gi, "").trim();
    const colorMatch = cleaned.match(
      /^(crimson|amber|azure|violet|topaz|emerald)\b/i,
    );
    const color = colorMatch?.[1]
      ? colorMatch[1][0]!.toUpperCase() + colorMatch[1].slice(1).toLowerCase()
      : "Crystal";
    const effect = colorMatch
      ? cleaned.slice(colorMatch[0].length).trim() || cleaned
      : cleaned;
    return { color, effect, ...(tauforged ? { tauforged: true as const } : {}) };
  });
}

/**
 * Parse `/save-build` body after the command name.
 * Format:
 *   Name | warframe: X | primary: Y | … | crystals: … | folder: …
 */
export function parseSaveBuildArgs(
  argsText: string,
  defaults?: { folderId?: string | null },
): SavedBuild {
  const raw = argsText.trim();
  if (!raw) {
    return createEmptyBuild({ folderId: defaults?.folderId ?? null });
  }

  const segments = raw.split("|").map((s) => s.trim()).filter(Boolean);
  const map = new Map<string, string>();
  let name = "";

  for (const segment of segments) {
    const kv = segment.match(/^([a-z0-9_-]+)\s*:\s*(.+)$/i);
    if (kv) {
      map.set(kv[1]!.toLowerCase(), kv[2]!.trim());
    } else if (!name) {
      name = segment;
    }
  }

  if (!name) name = takeKv(map, "name", "build", "title") || "New build";

  return createEmptyBuild({
    name,
    folderId: defaults?.folderId ?? null,
    warframe: gearFromKv(
      map,
      ["warframe", "wf", "frame"],
      ["warframe-mods", "wf-mods", "frame-mods"],
      ["warframe-arcanes", "wf-arcanes", "frame-arcanes"],
    ),
    primary: gearFromKv(
      map,
      ["primary", "weapon", "prim"],
      ["primary-mods", "weapon-mods", "prim-mods"],
      ["primary-arcanes", "weapon-arcanes", "prim-arcanes", "arcanes"],
    ),
    secondary: gearFromKv(
      map,
      ["secondary", "sec"],
      ["secondary-mods", "sec-mods"],
      ["secondary-arcanes", "sec-arcanes"],
    ),
    melee: gearFromKv(
      map,
      ["melee"],
      ["melee-mods"],
      ["melee-arcanes"],
    ),
    companion: gearFromKv(
      map,
      ["companion", "pet", "sentinel"],
      ["companion-mods", "pet-mods", "sentinel-mods"],
      ["companion-arcanes", "pet-arcanes"],
    ),
    archonCrystals: parseCrystals(
      takeKv(map, "crystals", "shards", "archon", "archon-crystals"),
    ),
    notes: takeKv(map, "notes", "note") || undefined,
  });
}

/** Expose folder name hint from args for caller to resolve. */
export function folderNameFromSaveArgs(argsText: string): string | null {
  const segments = argsText.split("|").map((s) => s.trim()).filter(Boolean);
  for (const segment of segments) {
    const kv = segment.match(/^(folder)\s*:\s*(.+)$/i);
    if (kv) return kv[2]!.trim();
  }
  return null;
}

export function isSaveBuildSlash(text: string): boolean {
  const t = text.trim();
  return /^\/(save-build|savebuild|arsenal-save)\b/i.test(t);
}

export function stripSaveBuildCommand(text: string): string {
  return text
    .trim()
    .replace(/^\/(save-build|savebuild|arsenal-save)\b/i, "")
    .trim();
}

export function formatBuildSummary(build: SavedBuild): string {
  const lines = [
    `Saved build: **${build.name}**`,
    build.warframe.name ? `• Warframe: ${build.warframe.name}` : "• Warframe: —",
    build.primary.name ? `• Primary: ${build.primary.name}` : null,
    build.secondary.name ? `• Secondary: ${build.secondary.name}` : null,
    build.melee.name ? `• Melee: ${build.melee.name}` : null,
    build.companion.name ? `• Companion: ${build.companion.name}` : null,
    build.archonCrystals.length
      ? `• Archon crystals: ${build.archonCrystals
          .map((c) => `${c.color}${c.tauforged ? " (Tau)" : ""} ${c.effect}`.trim())
          .join("; ")}`
      : null,
    "",
    "Visible in the **Saved Builds** pane (browser localStorage; **Builds** drawer on phones).",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export function saveBuildUsageHelp(): string {
  return [
    "Usage: `/save-build <name> | warframe: … | primary: … | secondary: … | melee: … | companion: … | crystals: … | folder: …`",
    "",
    "Optional keyed fields:",
    "• `warframe-mods:` / `primary-mods:` / `melee-mods:` / `companion-mods:` (comma lists)",
    "• `primary-arcanes:` / `warframe-arcanes:` / …",
    "• `crystals:` e.g. `Crimson Melee Critical Damage, Amber Casting Speed`",
    "",
    "Aliases: `/savebuild`, `/arsenal-save`",
    "Empty `/save-build` adds a blank card. Use + / − on the desktop pane to add or remove slots.",
    "",
    "Example:",
    "`/save-build SP Nourish | warframe: Rhino Prime | primary: Coda Hema | companion: Carrier | crystals: Crimson Primary Damage | folder: Steel Path | primary-mods: Serration, Vital Sense | primary-arcanes: Primary Merciless`",
  ].join("\n");
}

/** Resolve folder by name (case-insensitive), creating it when missing. */
export function ensureFolderByName(
  memory: SavedBuildsMemory,
  folderName: string,
  now = Date.now(),
): { memory: SavedBuildsMemory; folderId: string } {
  const needle = folderName.trim().toLowerCase();
  const existing = memory.folders.find((f) => f.name.trim().toLowerCase() === needle);
  if (existing) return { memory, folderId: existing.id };
  const next = addFolder(memory, folderName.trim() || "New folder", now);
  const created = next.folders[next.folders.length - 1]!;
  return { memory: next, folderId: created.id };
}

export function applySaveBuildCommand(
  memory: SavedBuildsMemory,
  argsText: string,
  activeFolderId?: string | null,
): { memory: SavedBuildsMemory; build: SavedBuild; reply: string } {
  const folderHint = folderNameFromSaveArgs(argsText);
  let next = memory;
  let folderId: string | null =
    activeFolderId && activeFolderId !== "all" && activeFolderId !== "unfiled"
      ? activeFolderId
      : null;

  if (folderHint) {
    const ensured = ensureFolderByName(next, folderHint);
    next = ensured.memory;
    folderId = ensured.folderId;
  }

  const build = parseSaveBuildArgs(argsText, { folderId });
  next = addBuild(next, build);
  return {
    memory: next,
    build,
    reply: formatBuildSummary(build),
  };
}

