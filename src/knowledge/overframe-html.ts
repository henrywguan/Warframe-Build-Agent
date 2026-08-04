/**
 * Offline Overframe extractors for HTML / __NEXT_DATA__ saved from a real browser.
 * No network calls — Cloudflare is already solved by the human who saved the page.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { OVERFRAME_TOP_BUILDS, type OverframeBuildRank } from "./constants.js";
import {
  parseBuildPageMods,
  parseTopBuildLinks,
  stripTags,
  summarizeBuild,
} from "./overframe-parse.js";
import type { OverframeBuild } from "./types.js";

export type OverframeImportRow = {
  itemName: string;
  builds: Array<Omit<OverframeBuild, "rank"> & { rank: OverframeBuildRank }>;
};

function asRank(index: number): OverframeBuildRank {
  return (Math.min(OVERFRAME_TOP_BUILDS, Math.max(1, index + 1)) || 1) as OverframeBuildRank;
}

function guessItemNameFromHtml(html: string, filePath?: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) {
    const cleaned = stripTags(title)
      .replace(/\s*[|\-–].*$/, "")
      .replace(/\s*builds?\s*$/i, "")
      .trim();
    if (cleaned && !/just a moment/i.test(cleaned)) return cleaned;
  }
  const itemUrl = html.match(/overframe\.gg\/items\/([^"'/?#]+)/i)?.[1];
  if (itemUrl) {
    return decodeURIComponent(itemUrl)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (filePath) {
    const base = path.basename(filePath, path.extname(filePath));
    return base.replace(/^overframe-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Unknown Item";
}

/** Parse one saved Overframe HTML (or raw __NEXT_DATA__ JSON wrapper) into an import row. */
export function parseOverframeHtmlFile(
  htmlOrJson: string,
  options?: { itemName?: string; filePath?: string },
): OverframeImportRow | null {
  const raw = htmlOrJson.trim();
  if (!raw || /just a moment/i.test(raw.slice(0, 800))) return null;

  let html = raw;
  // Allow saving only the __NEXT_DATA__ JSON blob.
  if (raw.startsWith("{") && !raw.includes("<html")) {
    html = `<script id="__NEXT_DATA__" type="application/json">${raw}</script>`;
  }

  const itemName = options?.itemName?.trim() || guessItemNameFromHtml(html, options?.filePath);
  const topBuilds = parseTopBuildLinks(itemName, html).slice(0, OVERFRAME_TOP_BUILDS);
  const pageMods = parseBuildPageMods(html);
  const richMods =
    (pageMods.mods.length || 0) + (pageMods.arcanes.length || 0) >= 3;

  // Dedicated build pages: rich mod list, at most one top build card.
  const looksLikeBuildPage =
    richMods &&
    (topBuilds.length <= 1 ||
      /overframe\.gg\/build\/\d+/i.test(html) ||
      Boolean(options?.filePath && /build/i.test(path.basename(options.filePath))));

  if (looksLikeBuildPage) {
    const name = pageMods.name || topBuilds[0]?.name || itemName;
    return {
      itemName,
      builds: [
        {
          rank: 1,
          name,
          url: topBuilds[0]?.url,
          forma: pageMods.forma,
          mods: pageMods.mods.length ? pageMods.mods : undefined,
          arcanes: pageMods.arcanes.length ? pageMods.arcanes : undefined,
          summary: summarizeBuild(name, pageMods.mods, pageMods.arcanes),
        },
      ],
    };
  }

  const builds = topBuilds.map((build, index) => ({
    ...build,
    rank: asRank(index),
    summary:
      build.summary ||
      summarizeBuild(build.name, build.mods ?? [], build.arcanes ?? []),
  }));

  if (!builds.length) return null;
  return { itemName, builds };
}

export async function parseOverframeHtmlPaths(
  inputs: string[],
  options?: { itemName?: string },
): Promise<{ rows: OverframeImportRow[]; skipped: string[]; errors: string[] }> {
  const files: string[] = [];
  for (const input of inputs) {
    const resolved = path.resolve(input);
    try {
      const statNames = await readdir(resolved, { withFileTypes: true });
      for (const entry of statNames) {
        if (!entry.isFile()) continue;
        if (!/\.(html?|json)$/i.test(entry.name)) continue;
        files.push(path.join(resolved, entry.name));
      }
    } catch {
      files.push(resolved);
    }
  }

  const byItem = new Map<string, OverframeImportRow>();
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const text = await readFile(file, "utf8");
      const row = parseOverframeHtmlFile(text, {
        itemName: options?.itemName,
        filePath: file,
      });
      if (!row) {
        skipped.push(file);
        continue;
      }
      const key = row.itemName.toLowerCase();
      const existing = byItem.get(key);
      if (!existing) {
        byItem.set(key, row);
        continue;
      }
      // Merge build pages into an item's top-N list by URL/name.
      const merged = [...existing.builds];
      for (const build of row.builds) {
        const dup = merged.find(
          (b) =>
            (build.url && b.url && build.url === b.url) ||
            b.name.toLowerCase() === build.name.toLowerCase(),
        );
        if (dup) {
          if ((build.mods?.length || 0) > (dup.mods?.length || 0)) dup.mods = build.mods;
          if ((build.arcanes?.length || 0) > (dup.arcanes?.length || 0)) {
            dup.arcanes = build.arcanes;
          }
          continue;
        }
        if (merged.length < OVERFRAME_TOP_BUILDS) {
          merged.push({ ...build, rank: asRank(merged.length) });
        }
      }
      byItem.set(key, { itemName: existing.itemName, builds: merged });
    } catch (error) {
      errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { rows: [...byItem.values()], skipped, errors };
}
