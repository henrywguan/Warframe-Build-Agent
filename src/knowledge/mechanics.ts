/**
 * Pull curated Warframe Wiki mechanics / resource digests into the local pack.
 * Many mechanics pages return empty TextExtracts — fall back to action=parse wikitext.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { writeFileDurable } from "./fs-write.js";
import { fetchJson, mapPool, sleep } from "./http.js";
import { MECHANICS_TOPICS, type MechanicsTopic } from "./mechanics-topics.js";
import { knowledgePaths } from "./paths.js";
import type { MechanicsDigest } from "./types.js";

const WIKI_API = "https://wiki.warframe.com/api.php";

type ExtractQuery = {
  query?: {
    pages?: Array<{
      title?: string;
      extract?: string;
      missing?: boolean;
    }>;
    redirects?: Array<{ from: string; to: string }>;
  };
};

type ParseResponse = {
  parse?: {
    title?: string;
    wikitext?: string;
  };
  error?: { code?: string; info?: string };
};

function cleanExtract(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Best-effort wikitext → plain text for offline agent recall. */
export function wikitextToPlain(wikitext: string): string {
  let text = wikitext;
  // Drop categories / language links / file embeds early.
  text = text.replace(/\[\[Category:[^\]]*\]\]/gi, " ");
  text = text.replace(/\[\[[a-z-]{2,}:[^\]]*\]\]/gi, " ");
  // Templates → keep inner useful args lightly, else drop.
  for (let i = 0; i < 8; i += 1) {
    const next = text.replace(/\{\{[^{}]*\}\}/g, " ");
    if (next === text) break;
    text = next;
  }
  // Tables / markup noise
  text = text
    .replace(/\{\|[\s\S]*?\|\}/g, " ")
    .replace(/^\s*[|!].*$/gm, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/'''?/g, "")
    .replace(/<{2,}.*?>{2,}/g, " ");
  // Links [[target|label]] / [[target]]
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  // External links
  text = text.replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/gi, "$1");
  text = text.replace(/\[https?:\/\/[^\s\]]+\]/gi, " ");
  // Headings
  text = text.replace(/^={1,6}\s*(.*?)\s*={1,6}\s*$/gm, "\n$1\n");
  // Lists
  text = text.replace(/^\s*[*#:;]+\s*/gm, "• ");
  // HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  // Refs / leftover braces
  text = text.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, " ");
  text = text.replace(/\{\{|\}\}|\[\[|\]\]/g, " ");
  return cleanExtract(text).slice(0, 120_000);
}

function extractNamedSections(extract: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const names = [
    "Status Effects",
    "Status Effect",
    "Damage Types",
    "Combinations",
    "Combo",
    "Mechanics",
    "Notes",
    "Tips",
    "Bugs",
    "See Also",
  ];
  for (const name of names) {
    const re = new RegExp(
      `(?:^|\\n)${name}\\n([\\s\\S]*?)(?=\\n(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\n|$)`,
      "i",
    );
    const match = extract.match(re);
    if (match?.[1]?.trim()) {
      sections[name.toLowerCase().replace(/\s+/g, "_")] = match[1].trim().slice(0, 12_000);
    }
  }
  return sections;
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
  if (!extract) return null;
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
  if (!extract || extract.length < 80) return null;
  return { title: json.parse.title, extract };
}

export async function resolveMechanicsArticle(
  topic: MechanicsTopic,
): Promise<{ title: string; extract: string; pageUrl: string; via: "extract" | "parse" } | null> {
  try {
    const extracted = await fetchExtract(topic.title);
    if (extracted) {
      return {
        ...extracted,
        pageUrl: `https://wiki.warframe.com/w/${encodeURIComponent(extracted.title.replace(/ /g, "_"))}`,
        via: "extract",
      };
    }
  } catch {
    /* fall through to parse */
  }

  try {
    const parsed = await fetchParsedPlain(topic.title);
    if (parsed) {
      return {
        ...parsed,
        pageUrl: `https://wiki.warframe.com/w/${encodeURIComponent(parsed.title.replace(/ /g, "_"))}`,
        via: "parse",
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function pullMechanicsDigests(options?: {
  repoRoot?: string;
  topics?: MechanicsTopic[];
  concurrency?: number;
  onLog?: (line: string) => void;
  onProgress?: (done: number, total: number, name: string) => void;
}): Promise<{ digests: MechanicsDigest[]; failed: string[]; note: string }> {
  const topics = options?.topics ?? MECHANICS_TOPICS;
  const concurrency = Math.max(1, options?.concurrency ?? 3);
  const log = options?.onLog ?? (() => undefined);
  const paths = knowledgePaths(options?.repoRoot);
  await mkdir(paths.mechanicsDir, { recursive: true });

  let done = 0;
  let failed: string[] = [];
  const digests = (
    await mapPool(topics, concurrency, async (topic) => {
      try {
        const page = await resolveMechanicsArticle(topic);
        await sleep(120);
        if (!page) {
          failed.push(topic.title);
          return null;
        }
        const sections = extractNamedSections(page.extract);
        const digest: MechanicsDigest = {
          id: topic.id,
          title: page.title,
          kind: topic.kind,
          aliases: topic.aliases,
          summary: topic.summary,
          pageUrl: page.pageUrl,
          extract: page.extract.slice(0, 120_000),
          sections: Object.keys(sections).length ? sections : undefined,
          fetchedAt: new Date().toISOString(),
          source: "wiki",
          fetchMethod: page.via,
        };
        await writeFileDurable(
          path.join(paths.mechanicsDir, `${digest.id}.json`),
          `${JSON.stringify(digest, null, 2)}\n`,
        );
        return digest;
      } catch {
        failed.push(topic.title);
        return null;
      } finally {
        done += 1;
        options?.onProgress?.(done, topics.length, topic.title);
      }
    })
  ).filter((d): d is MechanicsDigest => Boolean(d));

  await writeFileDurable(
    paths.mechanicsIndex,
    `${JSON.stringify(
      {
        count: digests.length,
        failed,
        ids: digests.map((d) => d.id),
        kinds: Object.fromEntries(
          [...new Set(digests.map((d) => d.kind))].map((kind) => [
            kind,
            digests.filter((d) => d.kind === kind).length,
          ]),
        ),
      },
      null,
      2,
    )}\n`,
  );

  const note = `Mechanics/resource digests: ${digests.length}/${topics.length} (failed ${failed.length})`;
  log(note);
  if (failed.length) log(`  failed: ${failed.slice(0, 8).join(", ")}${failed.length > 8 ? "…" : ""}`);
  return { digests, failed, note };
}
