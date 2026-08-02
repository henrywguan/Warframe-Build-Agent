import { readFile } from "node:fs/promises";
import path from "node:path";

export type LoadedJson<T> =
  | { ok: true; data: T; source: string }
  | { ok: false; error: string };

function localDataCandidates(relativePaths: string[]): string[] {
  // Keep joins statically scoped so Next/Turbopack does not trace the whole repo.
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const out: string[] = [];
  for (const relative of relativePaths) {
    // Expected shapes: data/<job>/latest-*.json
    out.push(path.join(/* turbopackIgnore: true */ cwd, relative));
    out.push(path.join(/* turbopackIgnore: true */ cwd, "..", relative));
  }
  return out;
}

async function tryReadLocalJson<T>(relativePaths: string[]): Promise<LoadedJson<T> | null> {
  // Production deploys (e.g. Vercel with root=web) should use env URLs, not repo files.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_DAILY_DATA !== "true") {
    return null;
  }

  for (const candidate of localDataCandidates(relativePaths)) {
    try {
      const raw = await readFile(candidate, "utf8");
      return {
        ok: true,
        data: JSON.parse(raw) as T,
        source: candidate,
      };
    } catch {
      // try next candidate
    }
  }
  return null;
}

/** Resolve daily scrape JSON from an env URL, else local repo files (dev / monorepo). */
export async function loadDailyJson<T>(options: {
  envUrl: string | undefined;
  envName: string;
  localRelativePaths: string[];
  missingHint: string;
}): Promise<LoadedJson<T>> {
  const envUrl = options.envUrl?.trim();
  if (envUrl) {
    try {
      const response = await fetch(envUrl, { cache: "no-store" });
      if (!response.ok) {
        return {
          ok: false,
          error: `Could not load ${options.envName} (HTTP ${response.status}).`,
        };
      }
      return {
        ok: true,
        data: (await response.json()) as T,
        source: envUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: `Could not load ${options.envName}: ${message}`,
      };
    }
  }

  const local = await tryReadLocalJson<T>(options.localRelativePaths);
  if (local) return local;

  return { ok: false, error: options.missingHint };
}
