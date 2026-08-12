import type { PatchType } from "./types.js";
import { PATCH_NOTES_PC_URL, PATCH_NOTES_URL } from "./types.js";

/** Default tool/CLI body cap so large Update pages stay LLM-usable. */
export const PATCH_DETAIL_DEFAULT_MAX_CHARS = 12_000;

export interface PatchDetail {
  title: string;
  date?: string;
  url: string;
  version?: string;
  type: PatchType;
  body: string;
  truncated: boolean;
  sectionHeadings: string[];
  fullBodyLength: number;
}

const ALLOWED_HOST = "www.warframe.com";
const PATCH_PATH_RE = /^\/(?:en\/)?patch-notes\/pc\/([^/?#]+)/i;
const SECTION_HEADING_RE =
  /^(Additions|Changes|Fixes|Optimizations|Known Issues|New|General|UI|Controller|Railjack|Necramech|Operator|Companions|Weapons|Warframes|Quest|Mission|Invasion|Sortie|Steel Path|Hotfix|Update)\b/i;

function joinParts(
  parts: Array<string | undefined>,
  separator: string,
): string {
  return parts.filter(Boolean).join(separator);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) =>
      String.fromCharCode(parseInt(n, 16)),
    );
}

/** Convert a patch-note HTML fragment into readable plain text. */
export function htmlFragmentToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  return decodeEntities(withBreaks)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    // Official pages often put the <li> text on the next line.
    .replace(/^-\s*\n+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function classify(title: string): PatchType {
  if (/hotfix/i.test(title)) return "Hotfix";
  if (/\bupdate\s+\d+/i.test(title)) return "Update";
  return "Other";
}

function versionFrom(title: string, slug: string): string | undefined {
  const fromTitle = title.match(/\b(\d+\.\d+\.\d+(?:\.\d+)?)\b/);
  if (fromTitle?.[1]) return fromTitle[1];
  const fromId = slug.match(/^(\d+)-(\d+)-(\d+)(?:-(\d+))?$/);
  if (!fromId) return undefined;
  return joinParts([fromId[1], fromId[2], fromId[3], fromId[4]], ".");
}

function slugFromUrl(url: string): string {
  const cleaned = url.replace(/\/$/, "");
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}

/**
 * Resolve a version, slug, or official URL to a PC patch-notes page URL.
 * Returns null when the query is empty / "latest" (caller should use hub Newest).
 */
export function resolvePatchDetailUrl(query: string): string | null {
  const raw = query.trim();
  if (!raw || /^(latest|newest|current)$/i.test(raw)) return null;

  if (/^https?:\/\//i.test(raw)) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`Invalid patch-notes URL: ${raw}`);
    }
    if (parsed.hostname !== ALLOWED_HOST) {
      throw new Error(
        `Only official ${ALLOWED_HOST} patch-notes URLs are allowed.`,
      );
    }
    const match = parsed.pathname.match(PATCH_PATH_RE);
    if (!match?.[1]) {
      throw new Error(
        "URL must be an individual PC patch page like /en/patch-notes/pc/43-0-8.",
      );
    }
    return `${PATCH_NOTES_PC_URL}/${match[1]}`;
  }

  const versionMatch = raw.match(/^v?(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/i);
  if (versionMatch) {
    const slug = joinParts(
      [versionMatch[1], versionMatch[2], versionMatch[3], versionMatch[4]],
      "-",
    );
    return `${PATCH_NOTES_PC_URL}/${slug}`;
  }

  if (/^(\d+)-(\d+)-(\d+)(?:-(\d+))?$/.test(raw)) {
    return `${PATCH_NOTES_PC_URL}/${raw}`;
  }

  throw new Error(
    `Unrecognized patch query "${raw}". Use a version (43.0.8), slug (43-0-8), official URL, or "latest".`,
  );
}

function extractContentHtml(html: string): string | null {
  const bounded = html.match(
    /<div class="content">([\s\S]*?)<\/div>\s*<div class="ButtonGroup/,
  );
  if (bounded?.[1]) return bounded[1];

  const loose = html.match(/<div class="content">([\s\S]*?)<\/div>/);
  return loose?.[1] ?? null;
}

function extractSectionHeadings(body: string): string[] {
  const headings: string[] = [];
  const seen = new Set<string>();
  for (const line of body.split("\n")) {
    const trimmed = line.trim().replace(/:$/, "");
    if (!SECTION_HEADING_RE.test(trimmed) || trimmed.length >= 80) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    headings.push(trimmed);
  }
  return headings;
}

function truncateBody(
  body: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (body.length <= maxChars) return { text: body, truncated: false };
  const slice = body.slice(0, maxChars);
  const lastBreak = Math.max(
    slice.lastIndexOf("\n\n"),
    slice.lastIndexOf("\n- "),
    slice.lastIndexOf("\n"),
  );
  const cut = lastBreak > maxChars * 0.6 ? slice.slice(0, lastBreak) : slice;
  return { text: cut.trimEnd(), truncated: true };
}

/** Parse an individual official patch-notes HTML page into structured text. */
export function parsePatchDetailHtml(
  html: string,
  url: string,
  options: { maxChars?: number } = {},
): PatchDetail {
  const maxChars = options.maxChars ?? PATCH_DETAIL_DEFAULT_MAX_CHARS;
  const slug = slugFromUrl(url);

  const updateName = html.match(
    /<div class="update-name">\s*([^<]+?)\s*<\/div>/i,
  )?.[1];
  const pageTitle = html.match(/<title[^>]*>\s*([^<]*?)\s*<\/title>/i)?.[1];
  const title = decodeEntities(
    (updateName ?? pageTitle ?? slug)
      .replace(/^Warframe:\s*/i, "")
      .trim(),
  );

  const date = html
    .match(/<date class="date">\s*([^<]+?)\s*<\/date>/i)?.[1]
    ?.trim();

  const contentHtml = extractContentHtml(html);
  if (!contentHtml) {
    throw new Error(
      "Fetched the patch page, but could not find the notes content block. Markup may have changed.",
    );
  }

  const fullBody = htmlFragmentToPlainText(contentHtml);
  if (!fullBody) {
    throw new Error("Patch page content parsed empty.");
  }

  const { text: body, truncated } = truncateBody(fullBody, maxChars);
  const sectionHeadings = extractSectionHeadings(fullBody);

  return {
    title,
    date,
    url,
    version: versionFrom(title, slug),
    type: classify(title),
    body,
    truncated,
    sectionHeadings,
    fullBodyLength: fullBody.length,
  };
}

export function formatPatchDetail(detail: PatchDetail): string {
  const lines = [
    "Warframe patch notes (full page text)",
    `Title: ${detail.title}`,
    detail.date ? `Date: ${detail.date}` : null,
    `Type: ${detail.type}${detail.version ? ` (${detail.version})` : ""}`,
    `Source: ${detail.url}`,
    "",
    detail.body,
  ].filter((line): line is string => line !== null);

  if (detail.truncated) {
    lines.push(
      "",
      `…truncated for length (${detail.fullBodyLength} chars total; showing ~${detail.body.length}).`,
      "Open the Source URL for the complete official notes.",
    );
    if (detail.sectionHeadings.length) {
      lines.push(
        `Sections on this page: ${detail.sectionHeadings.join("; ")}`,
      );
    }
  }

  lines.push(
    "",
    `Hub listing: ${PATCH_NOTES_URL}`,
    "Summarize only from this official text — do not invent hotfix contents.",
  );
  return lines.join("\n");
}
