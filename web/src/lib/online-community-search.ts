import { fetchOverframeBuildsLive, type LiveOverframeBuild } from "@/lib/overframe-online";
import { fetchPagesForHits } from "@/lib/fetch-page";

export type WebHit = {
  title: string;
  url: string;
  snippet?: string;
};

async function fetchText(
  url: string,
  timeoutMs = 12_000,
  headers: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; WarframeBuildAgent/0.1; +https://github.com/henrywguan/Warframe-Build-Agent)",
        ...headers,
      },
    });
    return { ok: response.ok, status: response.status, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

function decodeDuckUrl(href: string): string {
  try {
    const absolute = href.startsWith("//")
      ? `https:${href}`
      : href.startsWith("/")
        ? `https://html.duckduckgo.com${href}`
        : href;
    const parsed = new URL(absolute);
    const uddg = parsed.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return absolute;
  } catch {
    return href;
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse DuckDuckGo HTML search results (no API key). */
export function parseDuckDuckGoHtml(html: string, limit = 5): WebHit[] {
  const hits: WebHit[] = [];
  const seen = new Set<string>();
  const re =
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && hits.length < limit) {
    const url = decodeDuckUrl(match[1]!);
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    if (/duckduckgo\.com/i.test(url)) continue;
    seen.add(url);
    hits.push({
      title: stripTags(match[2] || "").slice(0, 140) || url,
      url,
    });
  }

  if (!hits.length) {
    const loose =
      /<a[^>]+href="([^"]*uddg=[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = loose.exec(html)) && hits.length < limit) {
      const url = decodeDuckUrl(match[1]!);
      if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
      if (/duckduckgo\.com/i.test(url)) continue;
      seen.add(url);
      hits.push({
        title: stripTags(match[2] || "").slice(0, 140) || url,
        url,
      });
    }
  }
  return hits;
}

export async function searchDuckDuckGo(query: string, limit = 5): Promise<WebHit[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const page = await fetchText(url, 12_000, {
    Accept: "text/html",
  });
  if (!page.ok) return [];
  return parseDuckDuckGoHtml(page.text, limit);
}

export async function searchWarframeWiki(query: string): Promise<WebHit[]> {
  const api = `https://wiki.warframe.com/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
  try {
    const page = await fetchText(api, 10_000, { Accept: "application/json" });
    if (!page.ok) return [];
    const data = JSON.parse(page.text) as unknown;
    if (!Array.isArray(data) || data.length < 4) return [];
    const titles = Array.isArray(data[1]) ? data[1] : [];
    const urls = Array.isArray(data[3]) ? data[3] : [];
    const hits: WebHit[] = [];
    for (let i = 0; i < Math.min(titles.length, urls.length, 5); i += 1) {
      const title = String(titles[i] ?? "").trim();
      const url = String(urls[i] ?? "").trim();
      if (title && url) hits.push({ title, url });
    }
    return hits;
  } catch {
    return [];
  }
}

function formatBuild(build: LiveOverframeBuild): string {
  const lines = [
    `${build.rank}. ${build.name}${build.author ? ` (by ${build.author})` : ""}`,
  ];
  if (build.url) lines.push(`   ${build.url}`);
  if (build.mods?.length) lines.push(`   Mods: ${build.mods.join(", ")}`);
  if (build.arcanes?.length) lines.push(`   Arcanes: ${build.arcanes.join(", ")}`);
  if (build.summary && !build.mods?.length) lines.push(`   ${build.summary}`);
  if (build.notes) lines.push(`   Note: ${build.notes}`);
  return lines.join("\n");
}

function formatHits(label: string, hits: WebHit[]): string {
  if (!hits.length) return `${label}: (none)`;
  return [
    `${label}:`,
    ...hits.map((hit, i) => `${i + 1}. ${hit.title}\n   ${hit.url}`),
  ].join("\n");
}

/**
 * General public-web search for AI chat (DuckDuckGo + Warframe Wiki).
 * Available when the WebUI AI toggle is on.
 * When Online search is on, also auto-fetches full-page excerpts from top hits.
 */
export async function searchWebOnline(
  query: string,
  options: { fetchPages?: boolean } = {},
): Promise<string> {
  const q = query.trim();
  if (!q) return "Missing required query.";

  const warframey = /\bwarframe\b|\bbuild\b|\bmod\b|\bprime\b|\bfissure\b|\bsortie\b/i.test(
    q,
  );
  const searchQuery = warframey ? q : `${q} warframe`;

  const [webHits, wikiHits] = await Promise.all([
    searchDuckDuckGo(searchQuery, 6).catch(() => [] as WebHit[]),
    searchWarframeWiki(q).catch(() => [] as WebHit[]),
  ]);

  const lines = [
    `WEB_SEARCH_RESULTS for ${q}`,
    "Use these public results to back up your answer. Cite real URLs only — do not invent links.",
    "",
    formatHits("Public web (DuckDuckGo)", webHits),
    "",
    formatHits("Warframe Wiki", wikiHits),
  ];

  if (!webHits.length && !wikiHits.length) {
    lines.push("");
    lines.push(
      "No web results returned. Answer from local tools/knowledge and say the live search was empty.",
    );
  } else if (options.fetchPages !== false) {
    const deep = await fetchPagesForHits([...wikiHits, ...webHits], {
      limit: 2,
      maxCharsEach: 4_000,
    });
    if (deep) {
      lines.push("", deep);
      lines.push(
        "",
        "Prefer FULL_PAGE_EXCERPTS above over inventing details. Call fetch_web_page for any other promising URL.",
      );
    }
  }

  return lines.join("\n");
}

/**
 * Live community + public-web search for build advice.
 * Prefer calling only when the WebUI Online search toggle is on.
 * Auto-fetches full-page excerpts from top Wiki/web hits.
 */
export async function searchCommunityBuildsOnline(query: string): Promise<string> {
  const item = query.trim();
  if (!item) return "Missing required query (item or build topic).";

  const [overframe, webHits, youtubeHits, wikiHits] = await Promise.all([
    fetchOverframeBuildsLive(item),
    searchDuckDuckGo(`${item} warframe build overframe`, 5).catch(() => [] as WebHit[]),
    searchDuckDuckGo(`${item} warframe build site:youtube.com`, 4).catch(() => [] as WebHit[]),
    searchWarframeWiki(item).catch(() => [] as WebHit[]),
  ]);

  const lines: string[] = [
    `ONLINE_COMMUNITY_SEARCH_RESULTS for ${item}`,
    "Use these live results for community comparisons. Cite real URLs only — do not invent links.",
    "",
  ];

  if (overframe.status === "ok" && overframe.builds.length) {
    lines.push(`Overframe (${overframe.detail}${overframe.itemUrl ? ` · ${overframe.itemUrl}` : ""}):`);
    for (const build of overframe.builds) lines.push(formatBuild(build));
  } else {
    lines.push(`Overframe: ${overframe.status} — ${overframe.detail}`);
  }

  lines.push("");
  lines.push(formatHits("Public web (DuckDuckGo)", webHits));
  lines.push("");
  lines.push(formatHits("YouTube (DuckDuckGo site:youtube.com)", youtubeHits));
  lines.push("");
  lines.push(formatHits("Warframe Wiki", wikiHits));

  const any =
    overframe.builds.length > 0 ||
    webHits.length > 0 ||
    youtubeHits.length > 0 ||
    wikiHits.length > 0;
  if (!any) {
    lines.push("");
    lines.push(
      "No live community results returned. Stay local + agent-calculated, or import Overframe builds (docs/overframe-crawl.md).",
    );
  } else {
    const deepHits = [
      ...wikiHits,
      ...webHits.filter((hit) => !/youtube\.com|youtu\.be/i.test(hit.url)),
    ];
    if (overframe.itemUrl) {
      deepHits.unshift({ title: `${item} (Overframe)`, url: overframe.itemUrl });
    }
    const deep = await fetchPagesForHits(deepHits, { limit: 2, maxCharsEach: 4_000 });
    if (deep) {
      lines.push("", deep);
      lines.push(
        "",
        "Prefer FULL_PAGE_EXCERPTS above. Call fetch_web_page for more URLs if needed. Never invent mods from titles alone.",
      );
    }
  }

  return lines.join("\n");
}
