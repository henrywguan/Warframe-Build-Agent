/** CLI helpers for farm / builds / preset-list / sync-mods shortcuts. */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveRepoRoot } from "./repo-root.js";
import { knowledgeRoot } from "./paths.js";
import {
  loadCatalog,
  loadItemBuilds,
  loadManifest,
  loadWikiDigest,
} from "./store.js";
import { findCatalogMatches } from "./query.js";
import { loadCommonMods } from "./dps/mods.js";
import { formatPresetHelp } from "./dps/compare.js";

const ACQUISITION_RE =
  /Acquisition\s+([\s\S]*?)(?=\n\n(?:Crafting|Notes|Tips|Trivia|Media|Patch History|See also)|$)/i;

export function extractAcquisitionBlob(extract: string): string | null {
  const match = extract.match(ACQUISITION_RE);
  if (!match?.[1]) return null;
  const blob = match[1].replace(/\s+/g, " ").trim();
  return blob || null;
}

export async function formatFarmRoute(
  itemQuery: string,
  options?: { repoRoot?: string },
): Promise<string> {
  const repoRoot = options?.repoRoot ?? resolveRepoRoot();
  const manifest = await loadManifest(repoRoot);
  if (!manifest) {
    return "Local knowledge pack not found. Run: npm run knowledge -- pull";
  }
  const catalog = await loadCatalog(repoRoot);
  const matches = findCatalogMatches(catalog, itemQuery, 3);
  if (!matches.length) {
    return [
      `No catalog match for “${itemQuery}”.`,
      "Try a different spelling, or: npm run knowledge -- lookup \"…\"",
    ].join("\n");
  }

  const lines = [
    `Farming route (offline pack · ${manifest.generatedAt})`,
    "",
  ];
  for (const item of matches) {
    lines.push(`## ${item.name}`);
    if (item.masteryReq != null) lines.push(`Mastery: ${item.masteryReq}`);
    if (item.wikiaUrl) lines.push(item.wikiaUrl);
    const wiki = await loadWikiDigest(item.id, repoRoot);
    if (!wiki?.extract) {
      lines.push("No wiki digest — run npm run knowledge -- pull");
      lines.push("");
      continue;
    }
    const acquisition = extractAcquisitionBlob(wiki.extract);
    if (acquisition) {
      lines.push("### Acquisition", acquisition);
    } else {
      lines.push(
        "### Acquisition (best-effort wiki extract)",
        wiki.extract.slice(0, 900).trim() + (wiki.extract.length > 900 ? "…" : ""),
      );
    }
    lines.push("", wiki.pageUrl, "");
  }
  lines.push("Tip: ask in chat with the farming-route skill for quest gates + alternatives.");
  return lines.join("\n").trim();
}

export async function formatLocalBuildsOnly(
  itemQuery: string,
  options?: { repoRoot?: string },
): Promise<string> {
  const repoRoot = options?.repoRoot ?? resolveRepoRoot();
  const manifest = await loadManifest(repoRoot);
  if (!manifest) {
    return "Local knowledge pack not found. Run: npm run knowledge -- pull";
  }
  const catalog = await loadCatalog(repoRoot);
  const matches = findCatalogMatches(catalog, itemQuery, 3);
  if (!matches.length) {
    return `No catalog match for “${itemQuery}”.`;
  }

  const lines = [
    `Local Overframe / imported builds (${manifest.overframeStatus} · ${manifest.generatedAt})`,
    "",
  ];
  let any = false;
  for (const item of matches) {
    const builds = await loadItemBuilds(item.id, repoRoot);
    lines.push(`## ${item.name}`);
    if (!builds?.builds?.length) {
      lines.push(
        builds?.error
          ? `Unavailable: ${builds.error}`
          : "No cached community builds for this item.",
        "Tip: enable Online search in web UI, or import builds (see docs/overframe-crawl.md).",
        "",
      );
      continue;
    }
    any = true;
    for (const build of builds.builds.slice(0, 3)) {
      lines.push(
        `${build.rank}. ${build.name}${build.forma != null ? ` · ${build.forma} forma` : ""}`,
      );
      if (build.summary) lines.push(build.summary);
      if (build.mods?.length) lines.push(`Mods: ${build.mods.join(", ")}`);
      if (build.arcanes?.length) lines.push(`Arcanes: ${build.arcanes.join(", ")}`);
      if (build.url) lines.push(build.url);
      lines.push("");
    }
  }
  if (!any) {
    lines.push("No local builds found for the matched items.");
  }
  return lines.join("\n").trim();
}

export async function formatPresetList(
  options?: { repoRoot?: string },
): Promise<string> {
  const common = await loadCommonMods(options?.repoRoot);
  const lines = [
    `DPS mod presets (asOf: ${common.asOf ?? "unknown"})`,
    "",
    formatPresetHelp(common.presets),
  ];
  if (common.notes?.length) {
    lines.push("", "Notes:");
    for (const note of common.notes.slice(0, 6)) lines.push(`• ${note}`);
  }
  lines.push(
    "",
    "Use: npm run knowledge -- dps \"<weapon>\" --preset <name>",
    "Or web: /preset <name> <weapon> · /dps <weapon> --preset <name>",
  );
  return lines.join("\n");
}

export async function syncModsAsOf(
  asOf: string,
  options?: { repoRoot?: string },
): Promise<string> {
  const repoRoot = options?.repoRoot ?? resolveRepoRoot();
  const filePath = path.join(knowledgeRoot(repoRoot), "dps", "common-mods.json");
  const raw = await readFile(filePath, "utf8");
  const data = JSON.parse(raw) as {
    version?: number;
    asOf?: string;
    notes?: string[];
    [key: string]: unknown;
  };
  const previous = data.asOf ?? "(none)";
  data.asOf = asOf;
  if (!Array.isArray(data.notes)) data.notes = [];
  const stamp = `Preset curator sync: asOf set to ${asOf} (was ${previous}).`;
  if (!data.notes.some((n) => n.includes(`asOf set to ${asOf}`))) {
    data.notes = [stamp, ...data.notes].slice(0, 12);
  }
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return [
    `Updated ${path.relative(repoRoot, filePath)}`,
    `asOf: ${previous} → ${asOf}`,
    "",
    "Reminder: review Galvanized / status presets with the preset-curator skill.",
    "Verify with: npm run knowledge -- preset-list",
  ].join("\n");
}
