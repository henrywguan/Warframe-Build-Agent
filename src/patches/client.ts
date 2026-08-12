import {
  parsePatchDetailHtml,
  resolvePatchDetailUrl,
  type PatchDetail,
} from "./detail.js";
import { parsePatchNotesHtml } from "./parse.js";
import {
  PATCH_NOTES_URL,
  type PatchClientOptions,
  type PatchEntry,
} from "./types.js";

export class PatchNotesError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "PatchNotesError";
    this.status = status;
    this.url = url;
  }
}

export class PatchNotesClient {
  readonly hubUrl: string;
  readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PatchClientOptions = {}) {
    this.hubUrl = options.hubUrl ?? PATCH_NOTES_URL;
    this.userAgent = options.userAgent ?? "warframe-build-agent/0.1.0";
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  private async fetchUrl(url: string): Promise<string> {
    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": this.userAgent,
      },
    });
    if (!response.ok) {
      throw new PatchNotesError(
        `Patch notes request failed (${response.status})`,
        response.status,
        url,
      );
    }
    return response.text();
  }

  async fetchHtml(): Promise<string> {
    return this.fetchUrl(this.hubUrl);
  }

  async listEntries(): Promise<PatchEntry[]> {
    const html = await this.fetchHtml();
    return parsePatchNotesHtml(html);
  }

  /** Resolve newest hub entry URL when query is empty / latest. */
  async resolveDetailUrl(query = "latest"): Promise<string> {
    const direct = resolvePatchDetailUrl(query);
    if (direct) return direct;

    const entries = await this.listEntries();
    const newest =
      entries.find((entry) => entry.newest) ?? entries[0] ?? null;
    if (!newest?.url) {
      throw new Error(
        "Could not resolve the newest patch-notes entry from the hub listing.",
      );
    }
    return newest.url;
  }

  async fetchDetail(
    query = "latest",
    options: { maxChars?: number } = {},
  ): Promise<PatchDetail> {
    const url = await this.resolveDetailUrl(query);
    const html = await this.fetchUrl(url);
    return parsePatchDetailHtml(html, url, options);
  }
}
