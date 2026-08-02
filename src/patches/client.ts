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

  async fetchHtml(): Promise<string> {
    const response = await this.fetchImpl(this.hubUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": this.userAgent,
      },
    });
    if (!response.ok) {
      throw new PatchNotesError(
        `Patch notes request failed (${response.status})`,
        response.status,
        this.hubUrl,
      );
    }
    return response.text();
  }

  async listEntries(): Promise<PatchEntry[]> {
    const html = await this.fetchHtml();
    return parsePatchNotesHtml(html);
  }
}
