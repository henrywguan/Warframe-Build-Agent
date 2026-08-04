import { OVERFRAME_TOP_BUILDS, type OverframeBuildRank } from "./constants.js";
import { fetchText, mapPool, sleep } from "./http.js";
import {
  isCloudflareChallenge,
  parseBuildPageMods,
  parseTopBuildLinks,
  summarizeBuild,
} from "./overframe-parse.js";
import type { CatalogItem, ItemBuilds, OverframeBuild } from "./types.js";

/**
 * Overframe is Cloudflare-protected from many datacenter IPs.
 * Crawl item pages for top-N builds, then each build page for mods + arcanes.
 * Use --import-builds when this network is blocked.
 */

export type OverframePullStatus = "ok" | "blocked" | "partial" | "skipped";

const BROWSER_UA =
  "Mozilla/5.0 (compatible; WarframeBuildAgent/0.1; +https://github.com/henrywguan/Warframe-Build-Agent)";

function overframeSearchUrl(itemName: string): string {
  return `https://overframe.gg/search/?q=${encodeURIComponent(itemName)}`;
}

function overframeItemGuessUrl(itemName: string): string {
  const slug = itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://overframe.gg/items/${slug}/`;
}

export async function probeOverframeAccess(): Promise<{
  reachable: boolean;
  status: number;
  detail: string;
}> {
  const result = await fetchText("https://overframe.gg/", {
    headers: { Accept: "text/html", "User-Agent": BROWSER_UA },
  });
  if (isCloudflareChallenge(result.status, result.text)) {
    return {
      reachable: false,
      status: result.status,
      detail: "Cloudflare bot challenge blocked overframe.gg from this network",
    };
  }
  return {
    reachable: result.ok,
    status: result.status,
    detail: result.ok ? "ok" : result.text.slice(0, 160),
  };
}

async function fetchHtml(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  return fetchText(url, {
    headers: {
      Accept: "text/html",
      Referer: "https://overframe.gg/",
      "User-Agent": BROWSER_UA,
    },
  });
}

async function enrichBuildFromPage(
  build: OverframeBuild,
  delayMs: number,
): Promise<OverframeBuild> {
  if (!build.url) return build;
  if ((build.mods?.length || 0) + (build.arcanes?.length || 0) >= 6) return build;
  await sleep(delayMs);
  const page = await fetchHtml(build.url);
  if (isCloudflareChallenge(page.status, page.text)) {
    return { ...build, notes: "Cloudflare challenge on build page" };
  }
  if (!page.ok) {
    return { ...build, notes: `Build page HTTP ${page.status}` };
  }
  const parsed = parseBuildPageMods(page.text);
  const mods = parsed.mods.length ? parsed.mods : build.mods;
  const arcanes = parsed.arcanes.length ? parsed.arcanes : build.arcanes;
  return {
    ...build,
    name: parsed.name || build.name,
    author: parsed.author || build.author,
    forma: parsed.forma ?? build.forma,
    mods,
    arcanes,
    modEntries: parsed.modEntries.length ? parsed.modEntries : build.modEntries,
    summary: summarizeBuild(parsed.name || build.name, mods ?? [], arcanes ?? []),
  };
}

export type CrawlOverframeOptions = {
  concurrency?: number;
  delayMs?: number;
  /** Skip enriching build detail pages (mods/arcanes). */
  skipBuildPages?: boolean;
  onProgress?: (done: number, total: number, itemName: string) => void;
  onLog?: (line: string) => void;
};

/** Full crawl: top N builds per catalog item, with mods + arcanes from build pages. */
export async function crawlOverframeTopBuilds(
  items: CatalogItem[],
  options: CrawlOverframeOptions = {},
): Promise<{ status: OverframePullStatus; entries: ItemBuilds[]; note: string }> {
  const log = options.onLog ?? (() => undefined);
  const probe = await probeOverframeAccess();
  if (!probe.reachable) {
    return {
      status: "blocked",
      entries: [],
      note: `${probe.detail}. Re-run crawl-overframe on a residential network, or pass --import-builds <file>.`,
    };
  }

  const concurrency = Math.max(1, options.concurrency ?? 2);
  const delayMs = options.delayMs ?? 450;
  let done = 0;
  let failures = 0;

  const entries = await mapPool(items, concurrency, async (item) => {
    const urls = [overframeItemGuessUrl(item.name), overframeSearchUrl(item.name)];
    let builds: OverframeBuild[] = [];
    let error: string | undefined;

    for (const url of urls) {
      const page = await fetchHtml(url);
      if (isCloudflareChallenge(page.status, page.text)) {
        error = "Cloudflare challenge while fetching item page";
        failures += 1;
        break;
      }
      if (!page.ok) {
        error = `HTTP ${page.status}`;
        continue;
      }
      builds = parseTopBuildLinks(item.name, page.text);
      if (builds.length) {
        error = undefined;
        break;
      }
      error = "No builds parsed from Overframe item/search HTML";
    }

    if (builds.length && !options.skipBuildPages) {
      const enriched: OverframeBuild[] = [];
      for (const build of builds.slice(0, OVERFRAME_TOP_BUILDS)) {
        try {
          enriched.push(await enrichBuildFromPage(build, delayMs));
        } catch (err) {
          enriched.push({
            ...build,
            notes: err instanceof Error ? err.message : String(err),
          });
        }
      }
      builds = enriched;
    }

    done += 1;
    options.onProgress?.(done, items.length, item.name);
    await sleep(delayMs);

    return {
      id: item.id,
      itemName: item.name,
      source: builds.length ? ("overframe" as const) : ("unavailable" as const),
      fetchedAt: new Date().toISOString(),
      builds: builds.slice(0, OVERFRAME_TOP_BUILDS).map((b, i) => ({
        ...b,
        rank: (i + 1) as OverframeBuildRank,
      })),
      error,
    } satisfies ItemBuilds;
  });

  const withBuilds = entries.filter((e) => e.builds.length > 0);
  const withMods = withBuilds.filter((e) =>
    e.builds.some((b) => (b.mods?.length || 0) + (b.arcanes?.length || 0) > 0),
  ).length;
  const status: OverframePullStatus =
    withBuilds.length === 0 ? "blocked" : withBuilds.length < entries.length ? "partial" : "ok";

  log(
    `Overframe crawl: ${withBuilds.length}/${entries.length} items with builds, ${withMods} with mod/arcane lists`,
  );

  return {
    status,
    entries: withBuilds,
    note:
      status === "ok"
        ? `Crawled top builds + mods/arcanes for ${withBuilds.length} items`
        : `Crawled ${withBuilds.length}/${items.length} items (${failures} hard failures; ${withMods} with mod lists)`,
  };
}

/** @deprecated alias — prefer crawlOverframeTopBuilds */
export async function pullOverframeTopBuilds(
  items: CatalogItem[],
  options?: CrawlOverframeOptions,
) {
  return crawlOverframeTopBuilds(items, options);
}

export function buildsFromImport(
  items: CatalogItem[],
  imported: Array<{
    itemName: string;
    builds: Array<Omit<OverframeBuild, "rank"> & { rank?: OverframeBuildRank }>;
  }>,
): ItemBuilds[] {
  const byName = new Map(imported.map((row) => [row.itemName.toLowerCase(), row]));
  const fetchedAt = new Date().toISOString();
  const out: ItemBuilds[] = [];
  for (const item of items) {
    const hit = byName.get(item.name.toLowerCase());
    if (!hit?.builds?.length) continue;
    out.push({
      id: item.id,
      itemName: item.name,
      source: "import",
      fetchedAt,
      builds: hit.builds.slice(0, OVERFRAME_TOP_BUILDS).map((build, index) => {
        const mods = build.mods ?? [];
        const arcanes = build.arcanes ?? [];
        return {
          ...build,
          rank: (build.rank ?? ((index + 1) as OverframeBuildRank)),
          mods: mods.length ? mods : undefined,
          arcanes: arcanes.length ? arcanes : undefined,
          summary:
            build.summary ||
            summarizeBuild(build.name, mods, arcanes),
        };
      }),
    });
  }
  return out;
}

/** Aggregate unique mods/arcanes referenced by crawled builds into ModDigest rows. */
export function indexModsFromBuilds(entries: ItemBuilds[]): import("./types.js").ModDigest[] {
  const map = new Map<string, import("./types.js").ModDigest>();
  for (const entry of entries) {
    for (const build of entry.builds) {
      const pairs: Array<{ name: string; kind: "mod" | "arcane" }> = [
        ...(build.mods ?? []).map((name) => ({ name, kind: "mod" as const })),
        ...(build.arcanes ?? []).map((name) => ({ name, kind: "arcane" as const })),
        ...(build.modEntries ?? []).map((e) => ({ name: e.name, kind: e.kind })),
      ];
      for (const { name, kind } of pairs) {
        const key = `${kind}:${name.toLowerCase()}`;
        const existing = map.get(key);
        if (existing) {
          if (!existing.seenOnItems?.includes(entry.itemName)) {
            existing.seenOnItems = [...(existing.seenOnItems ?? []), entry.itemName];
          }
          continue;
        }
        map.set(key, {
          name,
          kind,
          extract: `${kind} seen on Overframe top builds`,
          pageUrl: `https://wiki.warframe.com/w/${encodeURIComponent(name.replace(/ /g, "_"))}`,
          seenOnItems: [entry.itemName],
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
