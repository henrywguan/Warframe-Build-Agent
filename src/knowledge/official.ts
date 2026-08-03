/**
 * Pull official Warframe site digests (patch-notes hub + selected pages)
 * into the offline knowledge pack for local chatbot recall.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { writeFileDurable } from "./fs-write.js";
import { fetchText } from "./http.js";
import { knowledgePaths } from "./paths.js";
import type { OfficialDigest } from "./types.js";

const PATCH_HUB = "https://www.warframe.com/en/patch-notes";
const NEWS_HUB = "https://www.warframe.com/en/news";

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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Best-effort link harvest from official marketing HTML. */
export function parseOfficialHubLinks(
  html: string,
  baseUrl: string,
  kind: OfficialDigest["kind"],
  limit = 20,
): OfficialDigest[] {
  const fetchedAt = new Date().toISOString();
  const builds: OfficialDigest[] = [];
  const seen = new Set<string>();
  const linkRe = /href="((?:https:\/\/www\.warframe\.com)?\/en\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) && builds.length < limit) {
    let url = match[1]!;
    if (url.startsWith("/")) url = `https://www.warframe.com${url}`;
    if (url === baseUrl || url.endsWith("/news") || url.endsWith("/patch-notes")) continue;
    if (!/warframe\.com\/en\//i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const title = stripTags(match[2] || "").slice(0, 160);
    if (!title || title.length < 4) continue;
    // Prefer patch/news-looking paths.
    if (
      kind === "patch" &&
      !/patch|hotfix|update/i.test(url) &&
      !/patch|hotfix|update/i.test(title)
    ) {
      continue;
    }
    builds.push({
      id: `${kind}-${slugify(title) || String(builds.length + 1)}`,
      title,
      kind,
      pageUrl: url,
      extract: title,
      fetchedAt,
    });
  }
  return builds;
}

async function enrichDigest(digest: OfficialDigest): Promise<OfficialDigest> {
  const page = await fetchText(digest.pageUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": "WarframeBuildAgent/0.1 (+https://github.com/henrywguan/Warframe-Build-Agent)",
    },
  });
  if (!page.ok) {
    return { ...digest, extract: `${digest.title}\n(Fetch failed: HTTP ${page.status})` };
  }
  const text = stripTags(page.text).slice(0, 12_000);
  return {
    ...digest,
    extract: text || digest.title,
  };
}

export async function pullOfficialDigests(options?: {
  repoRoot?: string;
  limit?: number;
  skipPageBodies?: boolean;
  onLog?: (line: string) => void;
}): Promise<{ digests: OfficialDigest[]; note: string }> {
  const log = options?.onLog ?? (() => undefined);
  const limit = Math.max(1, Math.min(40, options?.limit ?? 12));
  const digests: OfficialDigest[] = [];

  log(`Fetching official patch hub: ${PATCH_HUB}`);
  const patchHub = await fetchText(PATCH_HUB, {
    headers: { Accept: "text/html", "User-Agent": "WarframeBuildAgent/0.1" },
  });
  if (patchHub.ok) {
    digests.push(...parseOfficialHubLinks(patchHub.text, PATCH_HUB, "patch", limit));
  } else {
    log(`Patch hub HTTP ${patchHub.status}`);
  }

  log(`Fetching official news hub: ${NEWS_HUB}`);
  const newsHub = await fetchText(NEWS_HUB, {
    headers: { Accept: "text/html", "User-Agent": "WarframeBuildAgent/0.1" },
  });
  if (newsHub.ok) {
    digests.push(...parseOfficialHubLinks(newsHub.text, NEWS_HUB, "news", Math.min(8, limit)));
  } else {
    log(`News hub HTTP ${newsHub.status}`);
  }

  // Always store a hub summary digest even if link harvest is thin.
  if (patchHub.ok) {
    digests.unshift({
      id: "official-patch-hub",
      title: "Warframe Official Patch Notes Hub",
      kind: "page",
      pageUrl: PATCH_HUB,
      extract: stripTags(patchHub.text).slice(0, 8000),
      fetchedAt: new Date().toISOString(),
    });
  }

  const unique = new Map<string, OfficialDigest>();
  for (const digest of digests) unique.set(digest.id, digest);
  let list = [...unique.values()].slice(0, limit + 4);

  if (!options?.skipPageBodies) {
    const enriched: OfficialDigest[] = [];
    for (const digest of list) {
      if (digest.id === "official-patch-hub") {
        enriched.push(digest);
        continue;
      }
      try {
        enriched.push(await enrichDigest(digest));
      } catch (err) {
        enriched.push({
          ...digest,
          extract: `${digest.title}\n(${err instanceof Error ? err.message : String(err)})`,
        });
      }
    }
    list = enriched;
  }

  const paths = knowledgePaths(options?.repoRoot);
  await mkdir(paths.officialDir, { recursive: true });
  for (const digest of list) {
    await writeFileDurable(
      path.join(paths.officialDir, `${digest.id}.json`),
      `${JSON.stringify(digest, null, 2)}\n`,
    );
  }
  await writeFileDurable(
    paths.officialIndex,
    `${JSON.stringify({ count: list.length, ids: list.map((d) => d.id) }, null, 2)}\n`,
  );

  const note = `Official site digests: ${list.length} (patch hub + news/page extracts)`;
  log(note);
  return { digests: list, note };
}
