/**
 * Fetch a public web page and convert HTML to readable plain text.
 * Used by the chat `fetch_web_page` tool and by search helpers that deep-read results.
 */

export const FETCH_PAGE_DEFAULT_MAX_CHARS = 10_000;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

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

/** Convert HTML to readable plain text (shared shape with patch-detail). */
export function htmlToPlainText(html: string): string {
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
    .replace(/^-\s*\n+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) {
    return true;
  }
  return false;
}

/** SSRF guard: http(s) only, no private/localhost hosts. */
export function assertSafePublicUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http(s) URLs are allowed.");
  }
  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error(`Blocked host (private/local): ${parsed.hostname}`);
  }
  return parsed;
}

export type FetchedPage = {
  url: string;
  title?: string;
  body: string;
  truncated: boolean;
  fullLength: number;
  status: number;
  /** How the page body was obtained. */
  via?: "direct" | "jina";
};

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>\s*([^<]*?)\s*<\/title>/i);
  return match?.[1] ? decodeEntities(match[1].trim()) : undefined;
}

function extractMainHtml(html: string): string {
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (article) return article;
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (main) return main;
  const content = html.match(
    /<div[^>]+class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  )?.[1];
  if (content && content.length > 200) return content;
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  return body ?? html;
}

/** Truncate plain text on a paragraph/bullet boundary when possible. */
export function truncatePlainText(
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

async function fetchViaJina(
  targetUrl: string,
  options: { maxChars: number; timeoutMs: number },
): Promise<FetchedPage> {
  // Jina reader: public proxy that returns Markdown/text for a URL.
  const jinaUrl = `https://r.jina.ai/${targetUrl}`;
  assertSafePublicUrl(jinaUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(jinaUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/plain,text/markdown,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; WarframeBuildAgent/0.1; +https://github.com/henrywguan/Warframe-Build-Agent)",
      },
    });
    if (!response.ok) {
      throw new Error(`Jina HTTP ${response.status} for ${targetUrl}`);
    }
    const text = (await response.text()).trim();
    if (text.length < 40) {
      throw new Error(`Jina returned empty/short content for ${targetUrl}`);
    }
    const { text: body, truncated } = truncatePlainText(text, options.maxChars);
    const titleMatch = text.match(/^Title:\s*(.+)$/m);
    return {
      url: targetUrl,
      title: titleMatch?.[1]?.trim(),
      body,
      truncated,
      fullLength: text.length,
      status: response.status,
      via: "jina",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPublicPage(
  rawUrl: string,
  options: { maxChars?: number; timeoutMs?: number; allowJinaFallback?: boolean } = {},
): Promise<FetchedPage> {
  const url = assertSafePublicUrl(rawUrl);
  const maxChars = options.maxChars ?? FETCH_PAGE_DEFAULT_MAX_CHARS;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const allowJinaFallback = options.allowJinaFallback !== false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; WarframeBuildAgent/0.1; +https://github.com/henrywguan/Warframe-Build-Agent)",
      },
    });
    const finalUrl = response.url || url.toString();
    // Re-check after redirects (SSRF via open redirect).
    assertSafePublicUrl(finalUrl);

    if (!response.ok) {
      if (allowJinaFallback) {
        return await fetchViaJina(url.toString(), { maxChars, timeoutMs });
      }
      throw new Error(`HTTP ${response.status} fetching ${finalUrl}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const html = await response.text();
    if (!/html|xml|text\/plain/i.test(contentType) && /<\s*html/i.test(html) === false) {
      const plain = html.slice(0, maxChars).trim();
      return {
        url: finalUrl,
        body: plain || `(non-HTML response, ${contentType || "unknown type"})`,
        truncated: html.length > maxChars,
        fullLength: html.length,
        status: response.status,
        via: "direct",
      };
    }

    const title = extractTitle(html);
    const fullBody = htmlToPlainText(extractMainHtml(html));
    if (!fullBody || fullBody.length < 80) {
      if (allowJinaFallback) {
        return await fetchViaJina(finalUrl, { maxChars, timeoutMs });
      }
      throw new Error(`Parsed empty content from ${finalUrl}`);
    }
    const { text: body, truncated } = truncatePlainText(fullBody, maxChars);
    return {
      url: finalUrl,
      title,
      body,
      truncated,
      fullLength: fullBody.length,
      status: response.status,
      via: "direct",
    };
  } catch (error) {
    if (allowJinaFallback) {
      try {
        return await fetchViaJina(url.toString(), { maxChars, timeoutMs });
      } catch {
        // fall through to original error
      }
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function formatFetchedPage(page: FetchedPage): string {
  const lines = [
    "WEB_PAGE_CONTENT",
    `Source: ${page.url}`,
    page.title ? `Title: ${page.title}` : null,
    page.via ? `Fetched via: ${page.via}` : null,
    "",
    page.body,
  ].filter((line): line is string => line !== null);

  if (page.truncated) {
    lines.push(
      "",
      `…truncated for length (${page.fullLength} chars total; showing ~${page.body.length}).`,
      "Open the Source URL for the complete page.",
    );
  }
  lines.push("", "Summarize only from this page text — do not invent missing details.");
  return lines.join("\n");
}

/** Fetch several result URLs and append readable excerpts. */
export async function fetchPagesForHits(
  hits: Array<{ title: string; url: string }>,
  options: { limit?: number; maxCharsEach?: number } = {},
): Promise<string> {
  const limit = options.limit ?? 2;
  const maxCharsEach = options.maxCharsEach ?? 4_000;
  const selected = hits.slice(0, limit);
  if (!selected.length) return "";

  const parts: string[] = [
    "FULL_PAGE_EXCERPTS (auto-fetched from top search hits):",
  ];
  for (const hit of selected) {
    try {
      const page = await fetchPublicPage(hit.url, { maxChars: maxCharsEach });
      parts.push(
        "",
        `### ${page.title || hit.title}`,
        `URL: ${page.url}`,
        page.body,
      );
    } catch (error) {
      parts.push(
        "",
        `### ${hit.title}`,
        `URL: ${hit.url}`,
        `(Could not fetch page: ${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }
  return parts.join("\n");
}
