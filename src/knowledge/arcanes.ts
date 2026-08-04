/**
 * Pull Warframe Wiki Arcane Enhancement digests into the local knowledge pack.
 * Sources: Category:Arcane Enhancements + overview page.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { writeFileDurable } from "./fs-write.js";
import { fetchJson, mapPool, sleep } from "./http.js";
import { wikitextToPlain } from "./mechanics.js";
import { knowledgePaths } from "./paths.js";
import type { ArcaneDigest, ArcaneSlot } from "./types.js";

const WIKI_API = "https://wiki.warframe.com/api.php";
const CATEGORY = "Category:Arcane Enhancements";
const OVERVIEW_TITLE = "Arcane Enhancement";
const SKIP_TITLES = new Set(["Arcane Enhancement", "Arcane Distiller"]);

function shouldSkipTitle(title: string): boolean {
  if (SKIP_TITLES.has(title)) return true;
  // Category sometimes includes Template: pages.
  if (title.startsWith("Template:")) return true;
  return false;
}

type CategoryQuery = {
  query?: { categorymembers?: Array<{ title?: string }>; };
  continue?: Record<string, string>;
};

type ExtractQuery = {
  query?: {
    pages?: Array<{ title?: string; extract?: string; missing?: boolean }>;
  };
};

type ParseResponse = {
  parse?: { title?: string; wikitext?: string };
  error?: { code?: string; info?: string };
};

function cleanExtract(raw: string): string {
  return raw.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

export function classifyArcaneSlot(title: string): ArcaneSlot {
  const t = title.toLowerCase();
  if (t.startsWith("primary ")) return "primary";
  if (t.startsWith("secondary ") || t.startsWith("akimbo ") || t.startsWith("cascadia ")) {
    return "secondary";
  }
  if (t.startsWith("melee ")) return "melee";
  if (t.startsWith("magus ")) return "operator";
  if (t.startsWith("virtuos ")) return "amp";
  if (t.startsWith("emergence ")) return "operator";
  if (t.startsWith("pax ")) return "kitgun";
  if (t.startsWith("exodia ")) return "zaw";
  if (t === "arcane enhancement" || t === "arcane") return "overview";
  if (t.startsWith("arcane ")) return "warframe";
  return "other";
}

export async function listArcaneWikiTitles(): Promise<string[]> {
  const titles: string[] = [OVERVIEW_TITLE];
  let cont: Record<string, string> = {};
  for (let guard = 0; guard < 20; guard += 1) {
    const url = new URL(WIKI_API);
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", CATEGORY);
    url.searchParams.set("cmlimit", "100");
    url.searchParams.set("cmtype", "page");
    for (const [key, value] of Object.entries(cont)) {
      url.searchParams.set(key, value);
    }
    const json = await fetchJson<CategoryQuery>(url.toString());
    for (const row of json.query?.categorymembers ?? []) {
      const title = row.title?.trim();
      if (!title || shouldSkipTitle(title)) continue;
      titles.push(title);
    }
    if (!json.continue) break;
    cont = json.continue;
    await sleep(100);
  }
  return [...new Set(titles)];
}

async function fetchExtract(title: string): Promise<{ title: string; extract: string } | null> {
  const url = new URL(WIKI_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("prop", "extracts");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exsectionformat", "plain");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);
  const json = await fetchJson<ExtractQuery>(url.toString());
  const page = json.query?.pages?.[0];
  if (!page || page.missing || !page.title) return null;
  const extract = cleanExtract(page.extract ?? "");
  if (!extract || extract.length < 40) return null;
  return { title: page.title, extract };
}

async function fetchParsedPlain(title: string): Promise<{ title: string; extract: string } | null> {
  const url = new URL(WIKI_API);
  url.searchParams.set("action", "parse");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("redirects", "1");
  const json = await fetchJson<ParseResponse>(url.toString());
  if (json.error || !json.parse?.title) return null;
  const extract = wikitextToPlain(json.parse.wikitext ?? "");
  if (!extract || extract.length < 40) return null;
  return { title: json.parse.title, extract };
}

function firstSentence(extract: string): string {
  const line = extract.split(/\n+/).find((l) => l.trim().length > 20)?.trim() ?? extract.trim();
  return line.slice(0, 240);
}

export async function pullArcaneDigests(options?: {
  repoRoot?: string;
  limit?: number;
  concurrency?: number;
  onLog?: (line: string) => void;
  onProgress?: (done: number, total: number, name: string) => void;
}): Promise<{ digests: ArcaneDigest[]; failed: string[]; note: string }> {
  const log = options?.onLog ?? (() => undefined);
  const concurrency = Math.max(1, options?.concurrency ?? 3);
  const paths = knowledgePaths(options?.repoRoot);
  await mkdir(paths.arcanesDir, { recursive: true });

  log(`Listing Wiki category: ${CATEGORY}`);
  let titles = await listArcaneWikiTitles();
  if (options?.limit && options.limit > 0) {
    titles = titles.slice(0, options.limit);
    log(`Limited to first ${titles.length} arcane titles`);
  }
  log(`Fetching ${titles.length} arcane digests...`);

  let done = 0;
  const failed: string[] = [];
  const digests = (
    await mapPool(titles, concurrency, async (title) => {
      try {
        let page = await fetchExtract(title);
        let method: "extract" | "parse" = "extract";
        // Many arcane pages have short TextExtracts; prefer Parse when richer.
        if (!page || page.extract.length < 400) {
          const parsed = await fetchParsedPlain(title);
          if (parsed && (!page || parsed.extract.length > page.extract.length)) {
            page = parsed;
            method = "parse";
          }
        }
        await sleep(80);
        if (!page) {
          failed.push(title);
          return null;
        }
        const slot = classifyArcaneSlot(page.title);
        const digest: ArcaneDigest = {
          id: slugify(page.title),
          title: page.title,
          slot,
          aliases: [
            page.title,
            page.title.replace(/^Arcane\s+/i, ""),
            ...(slot !== "other" && slot !== "overview" ? [`${slot} arcane`] : []),
          ].filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i),
          summary: firstSentence(page.extract),
          pageUrl: `https://wiki.warframe.com/w/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
          extract: page.extract.slice(0, 80_000),
          fetchedAt: new Date().toISOString(),
          source: "wiki",
          fetchMethod: method,
        };
        await writeFileDurable(
          path.join(paths.arcanesDir, `${digest.id}.json`),
          `${JSON.stringify(digest, null, 2)}\n`,
        );
        return digest;
      } catch {
        failed.push(title);
        return null;
      } finally {
        done += 1;
        options?.onProgress?.(done, titles.length, title);
      }
    })
  ).filter((d): d is ArcaneDigest => Boolean(d));

  const bySlot = Object.fromEntries(
    [...new Set(digests.map((d) => d.slot))].map((slot) => [
      slot,
      digests.filter((d) => d.slot === slot).length,
    ]),
  );

  await writeFileDurable(
    paths.arcanesIndex,
    `${JSON.stringify(
      {
        count: digests.length,
        failed,
        ids: digests.map((d) => d.id),
        slots: bySlot,
      },
      null,
      2,
    )}\n`,
  );

  const note = `Arcane digests: ${digests.length}/${titles.length} (failed ${failed.length})`;
  log(note);
  if (failed.length) {
    log(`  failed: ${failed.slice(0, 8).join(", ")}${failed.length > 8 ? "…" : ""}`);
  }
  return { digests, failed, note };
}
