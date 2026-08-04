/**
 * Live Overframe.gg fetch for a single item (web chat online search).
 * Cloudflare may block datacenter IPs — callers should fall back to other sources.
 */

export type LiveOverframeBuild = {
  rank: number;
  name: string;
  url?: string;
  author?: string;
  summary?: string;
  mods?: string[];
  arcanes?: string[];
  notes?: string;
};

export type LiveOverframeResult = {
  status: "ok" | "blocked" | "empty" | "error";
  itemName: string;
  builds: LiveOverframeBuild[];
  detail: string;
  itemUrl?: string;
};

const BROWSER_UA =
  "Mozilla/5.0 (compatible; WarframeBuildAgent/0.1; +https://github.com/henrywguan/Warframe-Build-Agent)";

function slugify(itemName: string): string {
  return itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isCloudflareChallenge(status: number, html: string): boolean {
  return status === 403 || /just a moment/i.test(html) || /cf-mitigated/i.test(html);
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function collectModNames(value: unknown, out: string[] = []): string[] {
  if (out.length >= 24) return out;
  if (typeof value === "string" && value.trim()) {
    out.push(value.trim());
    return out;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectModNames(entry, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const row = value as Record<string, unknown>;
  const name = asString(row.name) || asString(row.title);
  if (name && (row.rank != null || row.polarity != null || row.drain != null || row.uniqueName)) {
    out.push(name);
  }
  for (const nested of Object.values(row)) {
    if (out.length >= 24) break;
    collectModNames(nested, out);
  }
  return out;
}

function buildUrlFromRow(row: Record<string, unknown>): string | undefined {
  const direct =
    asString(row.url) ||
    asString(row.href) ||
    asString(row.link) ||
    asString(row.buildUrl) ||
    asString(row.path);
  if (!direct) return undefined;
  if (direct.startsWith("http")) return direct;
  if (direct.startsWith("/")) return `https://overframe.gg${direct}`;
  if (/^\d+\//.test(direct)) return `https://overframe.gg/build/${direct}`;
  return undefined;
}

function collectBuildCards(value: unknown, out: LiveOverframeBuild[] = []): LiveOverframeBuild[] {
  if (out.length >= 3) return out;
  if (Array.isArray(value)) {
    for (const entry of value) collectBuildCards(entry, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const row = value as Record<string, unknown>;
  const url = buildUrlFromRow(row);
  const name = asString(row.name) || asString(row.title);
  const mods = collectModNames(row.mods ?? row.modList ?? row.loadout);
  if (name && (url || mods.length)) {
    out.push({
      rank: out.length + 1,
      name,
      url,
      author:
        asString(row.author) ||
        (typeof row.user === "object" && row.user
          ? asString((row.user as Record<string, unknown>).name)
          : undefined),
      mods: mods.length ? mods : undefined,
      summary: mods.length ? `${name} · mods: ${mods.slice(0, 8).join(", ")}` : name,
    });
  }
  for (const nested of Object.values(row)) {
    if (out.length >= 3) break;
    collectBuildCards(nested, out);
  }
  return out.slice(0, 3);
}

/** Extract top build cards/links from an Overframe item or search HTML page. */
export function parseOverframeTopBuilds(itemName: string, html: string): LiveOverframeBuild[] {
  const nextMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (nextMatch?.[1]) {
    try {
      const found = collectBuildCards(JSON.parse(nextMatch[1]) as unknown);
      if (found.length) return found;
    } catch {
      /* fall through */
    }
  }

  const builds: LiveOverframeBuild[] = [];
  const linkRe =
    /href="((?:https:\/\/overframe\.gg)?\/build\/\d+\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) && builds.length < 3) {
    let url = match[1]!;
    if (url.startsWith("/")) url = `https://overframe.gg${url}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const label = stripTags(match[2] || "").slice(0, 160);
    builds.push({
      rank: builds.length + 1,
      name: label || `${itemName} build #${builds.length + 1}`,
      url,
      summary: label || `Top community build for ${itemName} on Overframe.`,
    });
  }
  return builds;
}

async function fetchHtml(
  url: string,
  timeoutMs = 12_000,
): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html",
        Referer: "https://overframe.gg/",
        "User-Agent": BROWSER_UA,
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function enrichBuild(build: LiveOverframeBuild): Promise<LiveOverframeBuild> {
  if (!build.url) return build;
  if ((build.mods?.length ?? 0) >= 4) return build;
  try {
    const page = await fetchHtml(build.url, 10_000);
    if (isCloudflareChallenge(page.status, page.text)) {
      return { ...build, notes: "Cloudflare challenge on build page" };
    }
    if (!page.ok) return { ...build, notes: `Build page HTTP ${page.status}` };
    const nextMatch = page.text.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
    );
    if (nextMatch?.[1]) {
      try {
        const mods = collectModNames(JSON.parse(nextMatch[1]) as unknown);
        if (mods.length) {
          return {
            ...build,
            mods,
            summary: `${build.name} · mods: ${mods.slice(0, 10).join(", ")}`,
          };
        }
      } catch {
        /* ignore */
      }
    }
    return build;
  } catch (error) {
    return {
      ...build,
      notes: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Live fetch top Overframe builds for one item name. */
export async function fetchOverframeBuildsLive(itemName: string): Promise<LiveOverframeResult> {
  const name = itemName.trim();
  if (!name) {
    return { status: "error", itemName: "", builds: [], detail: "Missing item name" };
  }

  const urls = [
    `https://overframe.gg/items/${slugify(name)}/`,
    `https://overframe.gg/search/?q=${encodeURIComponent(name)}`,
  ];

  let lastDetail = "No Overframe page fetched";
  for (const url of urls) {
    try {
      const page = await fetchHtml(url);
      if (isCloudflareChallenge(page.status, page.text)) {
        return {
          status: "blocked",
          itemName: name,
          builds: [],
          detail:
            "Cloudflare blocked overframe.gg from this network. Use DuckDuckGo/wiki results below, or import builds via npm run knowledge -- crawl-overframe.",
          itemUrl: url,
        };
      }
      if (!page.ok) {
        lastDetail = `HTTP ${page.status} for ${url}`;
        continue;
      }
      let builds = parseOverframeTopBuilds(name, page.text);
      if (!builds.length) {
        lastDetail = `No builds parsed from ${url}`;
        continue;
      }
      builds = await Promise.all(builds.slice(0, 3).map((b) => enrichBuild(b)));
      return {
        status: "ok",
        itemName: name,
        builds,
        detail: `Fetched ${builds.length} Overframe build(s)`,
        itemUrl: url,
      };
    } catch (error) {
      lastDetail = error instanceof Error ? error.message : String(error);
    }
  }

  return { status: "empty", itemName: name, builds: [], detail: lastDetail };
}
