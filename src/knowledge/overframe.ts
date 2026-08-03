import { fetchText, mapPool, sleep } from "./http.js";
import type { CatalogItem, ItemBuilds, OverframeBuild } from "./types.js";

/**
 * Overframe is Cloudflare-protected from many datacenter IPs.
 * This module best-effort fetches public HTML and parses top builds when reachable.
 * Use --import-builds to load a JSON export captured on a machine that can access overframe.gg.
 */

export type OverframePullStatus = "ok" | "blocked" | "partial" | "skipped";

function overframeSearchUrl(itemName: string): string {
  return `https://overframe.gg/search/?q=${encodeURIComponent(itemName)}`;
}

function overframeItemGuessUrl(itemName: string): string {
  const slug = itemName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://overframe.gg/items/${slug}/`;
}

/** Very small HTML helpers — Overframe markup changes; keep tolerant. */
function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBuildsFromHtml(itemName: string, html: string): OverframeBuild[] {
  // Prefer Next.js payload when present
  const nextMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (nextMatch?.[1]) {
    try {
      const data = JSON.parse(nextMatch[1]) as unknown;
      const found = collectBuildsFromUnknown(data).slice(0, 2);
      if (found.length) return found;
    } catch {
      // fall through to regex heuristics
    }
  }

  // Heuristic: build cards / links
  const builds: OverframeBuild[] = [];
  const linkRe =
    /href="(https:\/\/overframe\.gg\/build\/\d+\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((match = linkRe.exec(html)) && builds.length < 2) {
    const url = match[1]!;
    if (seen.has(url)) continue;
    seen.add(url);
    const label = stripTags(match[2] || "").slice(0, 160);
    builds.push({
      rank: (builds.length + 1) as 1 | 2,
      name: label || `${itemName} build #${builds.length + 1}`,
      url,
      summary: label || `Top community build for ${itemName} on Overframe.`,
    });
  }
  return builds;
}

function collectBuildsFromUnknown(value: unknown, out: OverframeBuild[] = []): OverframeBuild[] {
  if (out.length >= 2) return out;
  if (Array.isArray(value)) {
    for (const entry of value) collectBuildsFromUnknown(entry, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const row = value as Record<string, unknown>;

  const maybeUrl =
    typeof row.url === "string"
      ? row.url
      : typeof row.buildUrl === "string"
        ? row.buildUrl
        : typeof row.slug === "string" && typeof row.id === "number"
          ? `https://overframe.gg/build/${row.id}/${row.slug}`
          : undefined;

  const maybeName =
    typeof row.name === "string"
      ? row.name
      : typeof row.title === "string"
        ? row.title
        : undefined;

  const hasMods = Array.isArray(row.mods) || Array.isArray(row.modList);
  if (maybeName && (maybeUrl || hasMods)) {
    const mods = Array.isArray(row.mods)
      ? row.mods.map(String)
      : Array.isArray(row.modList)
        ? row.modList.map(String)
        : undefined;
    out.push({
      rank: (out.length + 1) as 1 | 2,
      name: maybeName,
      url: maybeUrl,
      author: typeof row.author === "string" ? row.author : undefined,
      rating: typeof row.rating === "number" ? row.rating : undefined,
      forma: typeof row.forma === "number" ? row.forma : undefined,
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
      mods,
      summary:
        mods?.length
          ? `${maybeName} — mods: ${mods.slice(0, 16).join(", ")}`
          : maybeName,
    });
  }

  for (const nested of Object.values(row)) {
    if (out.length >= 2) break;
    collectBuildsFromUnknown(nested, out);
  }
  return out.slice(0, 2);
}

export async function probeOverframeAccess(): Promise<{
  reachable: boolean;
  status: number;
  detail: string;
}> {
  const result = await fetchText("https://overframe.gg/", {
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (compatible; WarframeBuildAgent/0.1; +https://github.com/henrywguan/Warframe-Build-Agent)",
    },
  });
  if (result.status === 403 || /just a moment/i.test(result.text)) {
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

export async function pullOverframeTopBuilds(
  items: CatalogItem[],
  options?: {
    concurrency?: number;
    delayMs?: number;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<{ status: OverframePullStatus; entries: ItemBuilds[]; note: string }> {
  const probe = await probeOverframeAccess();
  if (!probe.reachable) {
    return {
      status: "blocked",
      entries: [],
      note: `${probe.detail}. Re-run on a residential network or pass --import-builds <file>.`,
    };
  }

  const concurrency = options?.concurrency ?? 2;
  const delayMs = options?.delayMs ?? 400;
  let done = 0;
  let failures = 0;

  const entries = await mapPool(items, concurrency, async (item) => {
    const urls = [overframeItemGuessUrl(item.name), overframeSearchUrl(item.name)];
    let builds: OverframeBuild[] = [];
    let error: string | undefined;
    for (const url of urls) {
      const page = await fetchText(url, {
        headers: {
          Accept: "text/html",
          Referer: "https://overframe.gg/",
        },
      });
      if (page.status === 403 || /just a moment/i.test(page.text)) {
        error = "Cloudflare challenge while fetching item page";
        failures += 1;
        break;
      }
      if (!page.ok) {
        error = `HTTP ${page.status}`;
        continue;
      }
      builds = parseBuildsFromHtml(item.name, page.text);
      if (builds.length) {
        error = undefined;
        break;
      }
      error = "No builds parsed from Overframe HTML";
    }

    done += 1;
    options?.onProgress?.(done, items.length);
    await sleep(delayMs);

    return {
      id: item.id,
      itemName: item.name,
      source: builds.length ? ("overframe" as const) : ("unavailable" as const),
      fetchedAt: new Date().toISOString(),
      builds,
      error,
    } satisfies ItemBuilds;
  });

  const withBuilds = entries.filter((e) => e.builds.length > 0).length;
  const status: OverframePullStatus =
    withBuilds === 0 ? "blocked" : withBuilds < entries.length ? "partial" : "ok";

  return {
    status,
    entries,
    note:
      status === "ok"
        ? `Fetched top builds for ${withBuilds} items`
        : `Fetched ${withBuilds}/${entries.length} items (${failures} hard failures)`,
  };
}

export function buildsFromImport(
  items: CatalogItem[],
  imported: Array<{
    itemName: string;
    builds: Array<Omit<OverframeBuild, "rank"> & { rank?: 1 | 2 }>;
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
      builds: hit.builds.slice(0, 2).map((build, index) => ({
        ...build,
        rank: (build.rank ?? ((index + 1) as 1 | 2)),
        summary:
          build.summary ||
          `${build.name}${build.mods?.length ? ` — mods: ${build.mods.join(", ")}` : ""}`,
      })),
    });
  }
  return out;
}
