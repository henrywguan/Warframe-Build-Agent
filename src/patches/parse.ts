import type { PatchEntry, PatchType } from "./types.js";

const ENTRY_RE =
  /<li>\s*(?:<span class="tag"><span class="label">([^<]+)<\/span><\/span>\s*)?<a href="(https:\/\/www\.warframe\.com\/en\/patch-notes\/pc\/[^"]+|\/patch-notes\/pc\/[^"]+)">([^<]+)<\/a>/gi;

function absolutize(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  // Hub relative links are `/patch-notes/pc/...`; prefer the /en/ locale path.
  const path = href.startsWith("/") ? href : `/${href}`;
  if (path.startsWith("/patch-notes/")) {
    return `https://www.warframe.com/en${path}`;
  }
  return `https://www.warframe.com${path}`;
}

function slugFromUrl(url: string): string {
  const cleaned = url.replace(/\/$/, "");
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}

function classify(title: string): PatchType {
  if (/hotfix/i.test(title)) return "Hotfix";
  if (/^update\s+\d+/i.test(title) || /\bupdate\s+\d+/i.test(title)) {
    return "Update";
  }
  return "Other";
}

function versionFrom(title: string, id: string): string | undefined {
  const fromTitle = title.match(/\b(\d+\.\d+\.\d+(?:\.\d+)?)\b/);
  if (fromTitle?.[1]) return fromTitle[1];
  const fromId = id.match(/^(\d+)-(\d+)-(\d+)(?:-(\d+))?$/);
  if (!fromId) return undefined;
  return [fromId[1], fromId[2], fromId[3], fromId[4]].filter(Boolean).join(".");
}

/** Parse PC patch/hotfix entries from the official Warframe patch-notes HTML. */
export function parsePatchNotesHtml(html: string): PatchEntry[] {
  const seen = new Set<string>();
  const entries: PatchEntry[] = [];

  for (const match of html.matchAll(ENTRY_RE)) {
    const label = (match[1] ?? "").trim();
    const url = absolutize(match[2] ?? "");
    const title = (match[3] ?? "").trim();
    if (!url || !title) continue;

    const id = slugFromUrl(url);
    if (seen.has(id)) continue;
    seen.add(id);

    entries.push({
      id,
      title,
      url,
      type: classify(title),
      newest: /^newest$/i.test(label),
      version: versionFrom(title, id),
    });
  }

  return entries;
}

export function computeNewEntries(
  previous: PatchEntry[],
  current: PatchEntry[],
): { newEntries: PatchEntry[]; removedIds: string[] } {
  const prevIds = new Set(previous.map((e) => e.id));
  const currIds = new Set(current.map((e) => e.id));
  return {
    newEntries: current.filter((e) => !prevIds.has(e.id)),
    removedIds: previous.map((e) => e.id).filter((id) => !currIds.has(id)),
  };
}
