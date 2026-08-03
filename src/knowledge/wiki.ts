import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchJson, mapPool, sleep } from "./http.js";
import { knowledgePaths } from "./paths.js";
import type { CatalogItem, WikiDigest } from "./types.js";

const WIKI_API = "https://wiki.warframe.com/api.php";

type MediaWikiParse = {
  query?: {
    pages?: Array<{
      pageid?: number;
      title?: string;
      extract?: string;
      missing?: boolean;
      pageprops?: { description?: string };
    }>;
  };
};

function cleanExtract(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleCandidates(item: CatalogItem): string[] {
  const candidates: string[] = [];
  if (item.wikiaUrl) {
    try {
      const u = new URL(item.wikiaUrl);
      const slug = decodeURIComponent(u.pathname.replace(/^\/(?:w|wiki)\//, "").replace(/_/g, " "));
      if (slug) candidates.push(slug);
    } catch {
      /* ignore bad URL */
    }
  }
  candidates.push(item.name);
  if (item.kind === "warframe" || item.kind === "archwing") {
    candidates.push(`${item.name}/Main`);
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const title of candidates) {
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}

async function fetchExtract(title: string): Promise<{ title: string; extract: string } | null> {
  const url = new URL(WIKI_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("prop", "extracts|pageprops");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exsectionformat", "plain");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);

  const json = await fetchJson<MediaWikiParse>(url.toString());
  const page = json.query?.pages?.[0];
  if (!page || page.missing || !page.title) return null;
  const extract = cleanExtract(page.extract ?? "");
  if (!extract) return null;
  return { title: page.title, extract };
}

/** Prefer a substantial article; many frames put gameplay text under Name/Main. */
async function resolveWikiArticle(
  item: CatalogItem,
): Promise<{ title: string; extract: string; pageUrl: string } | null> {
  let best: { title: string; extract: string } | null = null;

  for (const title of titleCandidates(item)) {
    try {
      const page = await fetchExtract(title);
      if (!page) continue;
      if (!best || page.extract.length > best.extract.length) {
        best = page;
      }
      if (page.extract.length >= 600) break;
    } catch {
      /* try next candidate */
    }
    await sleep(100);
  }

  if (!best) return null;
  const pageUrl = `https://wiki.warframe.com/w/${encodeURIComponent(best.title.replace(/ /g, "_"))}`;
  return { ...best, pageUrl };
}

export async function pullWikiDigests(
  items: CatalogItem[],
  options?: {
    repoRoot?: string;
    concurrency?: number;
    onProgress?: (done: number, total: number, name: string) => void;
  },
): Promise<{ digests: WikiDigest[]; failed: number }> {
  const concurrency = Math.max(1, options?.concurrency ?? 4);
  const wikiDir = knowledgePaths(options?.repoRoot).wikiDir;
  await mkdir(wikiDir, { recursive: true });
  let done = 0;
  let failed = 0;

  const digests = (
    await mapPool(items, concurrency, async (item) => {
      try {
        const page = await resolveWikiArticle(item);
        if (!page) {
          failed += 1;
          return null;
        }
        const digest: WikiDigest = {
          id: item.id,
          title: page.title,
          pageUrl: page.pageUrl,
          extract: page.extract.slice(0, 120_000),
          fetchedAt: new Date().toISOString(),
        };
        // Write incrementally so long pulls survive interruption.
        await writeFile(
          path.join(wikiDir, `${digest.id}.json`),
          `${JSON.stringify(digest, null, 2)}\n`,
          "utf8",
        );
        return digest;
      } catch {
        failed += 1;
        return null;
      } finally {
        done += 1;
        options?.onProgress?.(done, items.length, item.name);
      }
    })
  ).filter((d): d is WikiDigest => Boolean(d));

  return { digests, failed };
}
